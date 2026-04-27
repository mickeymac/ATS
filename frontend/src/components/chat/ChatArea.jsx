import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Button, Textarea, Spinner, Popover, PopoverTrigger, PopoverContent, Tooltip, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, CheckboxGroup, Checkbox, useDisclosure, Badge, Input } from '@nextui-org/react';
import { Send, Phone, Video, Search, Paperclip, FileText, Download, Mic, Square, Smile, Trash2, Users, UserPlus, Edit3, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { uploadChatAttachment } from '../../services/chatService';

const getFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  // Only prepend backend host for server-side uploads
  if (url.startsWith('/uploads')) {
    return `http://127.0.0.1:8000${url}`;
  }
  return url;
};

const parseDate = (d) => new Date(typeof d === 'string' && !d.endsWith('Z') ? d + 'Z' : d);

// Default working animated stickers
const DEFAULT_STICKERS = [
  "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif",
  "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
  "https://media.giphy.com/media/jUwpcgzaCJQOc/giphy.gif",
  "https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif",
  "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif"
];

// Standard Unicodes for Emojis
const POPULAR_EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","☺️","😊","😇","😍","🥰","😘",
  "😋","😛","😜","🤪","😝","🤑","🤔","🫡","🤫","🫠","🤥","😌","😔","😪","🤤","😴","😷",
  "👍","👎","👏","🙌","🫶","🤝","✌️","🤞","🫰","🤙","🖕","👀","❤️","🔥","✨","🎉","💯"
];

export default function ChatArea({ contact, messages, onSendMessage, onDeleteMessage, onClearChat, isTyping, typingUser, contacts }) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal state
  const {isOpen: isProfileOpen, onOpen: onProfileOpen, onOpenChange: onProfileOpenChange} = useDisclosure();
  const {isOpen: isGroupModalOpen, onOpen: onGroupModalOpen, onOpenChange: onGroupModalOpenChange} = useDisclosure();
  const {isOpen: isAddMemberOpen, onOpen: onAddMemberOpen, onOpenChange: onAddMemberOpenChange} = useDisclosure();
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [stagedAudio, setStagedAudio] = useState(null);
  const [stagedAudioUrl, setStagedAudioUrl] = useState(null);
  
  // Sticker/Emoji state
  const [showStickers, setShowStickers] = useState(false);
  
  // Group Management State
  const [groupMembers, setGroupMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  
  // Context & Refs
  const { subscribe, emit } = useSocket();
  const { addToast } = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [audioLevels, setAudioLevels] = useState(new Array(24).fill(0));

  const isAdmin = contact?.type === 'group' && contact?.admins?.includes(user?.id);

  // Available users not in group
  const availableToAdd = contacts?.filter(c => 
    c.type === 'user' && !groupMembers.some(m => m.id === c.id)
  ) || [];

  useEffect(() => {
    if (contact?.type === 'group' && isGroupModalOpen) {
      fetchMembers();
      setNewGroupName(contact.name);
    }
  }, [contact, isGroupModalOpen]);

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const { getGroupMembers } = await import('../../services/chatService');
      const data = await getGroupMembers(contact.id);
      setGroupMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim() || newGroupName === contact.name) {
       setIsEditingName(false);
       return;
    }
    try {
      const { updateGroup } = await import('../../services/chatService');
      await updateGroup(contact.id, { name: newGroupName });
      setIsEditingName(false);
      emit('chat:group_update', { group_id: contact.id });
      addToast('Group name updated', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const isSelf = memberId === user?.id;
    if (!window.confirm(isSelf ? "Are you sure you want to leave the group?" : "Are you sure you want to remove this member?")) return;
    try {
      const { removeGroupMember } = await import('../../services/chatService');
      await removeGroupMember(contact.id, memberId);
      setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      emit('chat:member_change', { group_id: contact.id, user_id: memberId, action: 'removed' });
      if (isSelf) onGroupModalOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMembers = async (onClose) => {
    if (selectedToAdd.length === 0) return;
    try {
      const { addGroupMembers } = await import('../../services/chatService');
      await addGroupMembers(contact.id, selectedToAdd);
      setSelectedToAdd([]);
      onClose();
      fetchMembers();
      emit('chat:member_change', { group_id: contact.id, action: 'added' });
      addToast('Members added to group', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadChatAttachment, updateGroup } = await import('../../services/chatService');
      const uploadData = await uploadChatAttachment(file);
      await updateGroup(contact.id, { profile_image: uploadData.file_url });
      emit('chat:group_update', { group_id: contact.id });
      addToast('Group profile picture updated', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    e.target.value = ''; // Reset input
    setIsUploading(true);
    try {
      const data = await uploadChatAttachment(file);
      onSendMessage('', data); // Auto-send file once uploaded
    } catch (error) {
      console.error('File upload failed', error);
      alert('Failed to upload file. The file might not be supported or too large.');
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new File(audioChunksRef.current, `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setStagedAudio(audioBlob);
        setStagedAudioUrl(URL.createObjectURL(audioBlob));
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Spectrum Visualization
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; 
        source.connect(analyser);
        audioCtxRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
          analyser.getByteFrequencyData(dataArray);
          // Get first 24 frequency bins and normalize
          const levels = Array.from(dataArray.slice(0, 24)).map(v => v / 255);
          setAudioLevels(levels);
          animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch (e) {
        console.error("Spectrum error", e);
      }
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 300) { // 5-minute cap
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required to send voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setAudioLevels(new Array(24).fill(0));
    }
  };

  const discardStagedAudio = () => {
    setStagedAudio(null);
    if (stagedAudioUrl) URL.revokeObjectURL(stagedAudioUrl);
    setStagedAudioUrl(null);
  };

  const sendStagedAudio = async () => {
    if (!stagedAudio) return;
    setIsUploading(true);
    try {
      const data = await uploadChatAttachment(stagedAudio);
      onSendMessage('', data);
      discardStagedAudio();
    } catch (error) {
      console.error('Audio upload failed', error);
      alert('Failed to send voice message.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendSticker = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    setShowStickers(false);
    onSendMessage('', { file_url: url, file_type: 'image', file_name: 'sticker.gif' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-default-50">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-2xl text-primary">💬</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">Select a chat to start messaging</h3>
        <p className="text-default-500">Communicate with your team in real-time.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Chat header */}
      <div className="h-16 border-b border-default-200 px-4 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0 z-10 shadow-sm relative">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-default-100 dark:hover:bg-zinc-900 p-2 -ml-2 rounded-xl transition-all"
          onClick={contact.type === 'group' ? onGroupModalOpen : onProfileOpen}
        >
          <Avatar 
            src={getFileUrl(contact.profile_image)}
            name={contact.name}
            icon={contact.type === 'group' ? <Users size={20} /> : undefined}
            fallback={<span className="font-semibold text-lg">{contact.name?.charAt(0)}</span>}
            className="w-10 h-10 ring-2 ring-transparent hover:ring-primary transition-all"
          />
          <div className="flex flex-col">
            <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{contact.name}</h3>
            <span className="text-xs text-default-500 flex items-center gap-1 mt-0.5">
              {contact.is_online ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success"></span> Online
                </>
              ) : (
                <span className="opacity-70">
                  {contact.last_seen 
                    ? `Last seen ${parseDate(contact.last_seen).toLocaleDateString()} ${parseDate(contact.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                    : 'Offline'}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-default-500">
          <Button isIconOnly variant="light" radius="full"><Search size={18} /></Button>
          <Button isIconOnly variant="light" radius="full"><Phone size={18} /></Button>
          <Button isIconOnly variant="light" radius="full"><Video size={18} /></Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-opacity-5 dark:bg-opacity-5 relative flex flex-col">
        <div className="flex flex-col gap-3 flex-1 justify-end">
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div 
                key={msg._id || idx} 
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`relative max-w-[75%] px-4 py-2 rounded-2xl group ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-default-100 dark:bg-zinc-800 text-foreground rounded-tl-sm shadow-sm'
                  }`}
                >
                  {isMe && !msg.is_deleted_for_everyone && (
                    <Popover placement="left">
                      <PopoverTrigger>
                        <button 
                          className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-danger/10 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/20 hover:scale-105"
                          title="Delete options"
                        >
                          <Trash2 size={16} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-1">
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="sm" 
                            variant="light" 
                            color="danger" 
                            className="justify-start font-medium"
                            onPress={() => onDeleteMessage(msg._id || msg.id, 'me')}
                          >
                            Delete for me
                          </Button>
                          <Button 
                            size="sm" 
                            variant="light" 
                            color="danger" 
                            className="justify-start font-medium"
                            onPress={() => onDeleteMessage(msg._id || msg.id, 'everyone')}
                          >
                            Delete for everyone
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {/* File Attachment Render */}
                  {!msg.is_deleted_for_everyone && msg.file_url && (
                    <div className="mb-2">
                      {msg.file_type === 'audio' ? (
                        <div className={`p-1 mt-1 ${isMe ? 'bg-primary-foreground/10' : 'bg-default-200'} rounded-full`}>
                          <audio controls src={getFileUrl(msg.file_url)} className="h-10 w-[220px] outline-none" />
                        </div>
                      ) : msg.file_type === 'image' ? (
                        <a href={getFileUrl(msg.file_url)} target="_blank" rel="noreferrer">
                          <img 
                            src={getFileUrl(msg.file_url)} 
                            alt="attachment" 
                            className="max-w-[240px] max-h-[300px] rounded-xl object-contain bg-black/10 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a 
                          href={getFileUrl(msg.file_url)} 
                          target="_blank" 
                          rel="noreferrer"
                          className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-primary-foreground/10 border-primary-foreground/20 text-white hover:bg-primary-foreground/20' : 'bg-background border-divider hover:bg-default-50'} transition-colors w-full max-w-[280px] break-all`}
                        >
                          <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                            <FileText size={24} />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-semibold truncate">{msg.file_name}</span>
                            <span className={`text-xs ${isMe ? 'text-primary-100' : 'text-default-500'} uppercase tracking-wider`}>Document</span>
                          </div>
                          <Download size={18} className="shrink-0 opacity-70" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Text Render */}
                  {msg.is_deleted_for_everyone ? (
                    <p className="text-sm italic opacity-70 flex items-center gap-2">
                       <Trash2 size={12} /> This message was deleted
                    </p>
                  ) : (
                    msg.message_text && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                    )
                  )}
                  
                  <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-primary-100' : 'text-default-400'}`}>
                    <span>{parseDate(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      <span className="inline-block ml-0.5">
                        {msg.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isTyping && typingUser === contact.id && (
            <div className="flex w-full justify-start mt-2">
              <div className="bg-default-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm inline-flex gap-1 items-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input area */}
      <div className="p-3 bg-white dark:bg-zinc-950 border-t border-default-200 shrink-0 relative">
        
        {/* Active Recording Overlay */}
        {isRecording && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-zinc-950 flex items-center justify-between px-6 border-t border-divider shadow-sm rounded-b-xl">
            <div className="flex items-center gap-3 text-danger">
              <div className="w-3 h-3 rounded-full bg-danger shadow-[0_0_8px_rgba(243,18,96,0.8)] animate-pulse"></div>
              <span className="font-mono font-bold text-lg">{formatDuration(recordingDuration)}</span>
            </div>

            {/* Audio Spectrum Visualizer */}
            <div className="flex-1 flex items-center justify-center gap-1 h-10 px-8">
              {audioLevels.map((level, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-danger rounded-full transition-all duration-75"
                  style={{ 
                    height: `${Math.max(10, level * 100)}%`,
                    opacity: 0.3 + (level * 0.7)
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Button color="danger" variant="light" isIconOnly onClick={() => { stopRecording(); discardStagedAudio(); }} className="text-default-500 hover:text-danger">
                <Trash2 size={20} />
              </Button>
              <Button color="success" isIconOnly onClick={stopRecording} className="text-white shadow-md rounded-full scale-110">
                <Square size={16} className="fill-current" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Staged Audio Preview Overlay */}
        {stagedAudioUrl && !isRecording && (
          <div className="absolute inset-0 z-40 bg-white dark:bg-zinc-950 flex items-center justify-between px-4 border-t border-divider rounded-b-xl">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Button color="danger" variant="light" isIconOnly onClick={discardStagedAudio} className="shrink-0 text-danger">
                <Trash2 size={20} />
              </Button>
              <audio src={stagedAudioUrl} controls className="h-10 flex-1 outline-none max-w-[400px]" />
            </div>
            <Button 
              isIconOnly 
              color="primary"
              size="sm" 
              radius="full" 
              onClick={sendStagedAudio}
              isLoading={isUploading}
              className="shrink-0 shadow-md transform hover:scale-105"
            >
              <Send size={16} />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex items-center self-end mb-1">
            <Popover 
              key={`stickers-${contact?.id}-${showStickers}`} 
              placement="top-start" 
              isOpen={showStickers} 
              onOpenChange={setShowStickers}
              showArrow
            >
              <PopoverTrigger>
                <Button 
                  isIconOnly 
                  variant="light" 
                  radius="full" 
                  className="text-default-500 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Smile size={22} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 w-72 z-[100]">
                <Tabs size="sm" aria-label="Emoji and Stickers" fullWidth color="primary">
                  <Tab key="emoji" title="Emojis">
                    <div className="grid grid-cols-7 gap-1 h-48 overflow-y-auto hidden-scrollbar pt-2">
                      {POPULAR_EMOJIS.map((emoji, idx) => (
                        <button 
                          key={idx} 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setInputText(prev => prev + emoji);
                          }}
                          className="text-xl hover:bg-default-200 rounded-lg p-1 transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </Tab>
                  <Tab key="stickers" title="GIFs">
                    <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto hidden-scrollbar pt-2">
                      {DEFAULT_STICKERS.map((stickerUrl, idx) => (
                        <button 
                          key={idx} 
                          onClick={(e) => handleSendSticker(e, stickerUrl)}
                          className="bg-default-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-default-200 transition-colors p-1 shadow-sm h-24 w-full border-none outline-none overflow-hidden"
                        >
                          <img src={stickerUrl} alt="sticker" className="w-full h-full object-cover rounded-md" />
                        </button>
                      ))}
                    </div>
                  </Tab>
                </Tabs>
              </PopoverContent>
            </Popover>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <Button 
              isIconOnly 
              variant="light" 
              radius="full" 
              onClick={() => fileInputRef.current?.click()}
              isDisabled={isUploading}
              className="text-default-500 shrink-0"
            >
              {isUploading ? <Spinner size="sm" /> : <Paperclip size={22} />}
            </Button>
          </div>

          <Textarea 
            minRows={1}
            maxRows={4}
            value={inputText}
            onValueChange={setInputText}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            variant="faded"
            className="flex-1"
            classNames={{
              input: "resize-none text-sm",
              inputWrapper: "py-2 bg-default-100"
            }}
            endContent={
              <Button 
                isIconOnly 
                color={inputText.trim() ? "primary" : "default"}
                size="sm" 
                radius="full" 
                onClick={inputText.trim() ? handleSend : startRecording}
                isDisabled={isUploading && !inputText.trim()}
                className={`mr-1 mb-1 mt-auto shrink-0 z-10 ${inputText.trim() ? 'shadow-md' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              >
                {inputText.trim() ? <Send size={16} /> : <Mic size={18} />}
              </Button>
            }
          />
        </div>
      </div>

      {/* User Profile & Chat Controls Modal */}
      <Modal isOpen={isProfileOpen} onOpenChange={onProfileOpenChange} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center items-center pt-8">
                <Avatar 
                  src={getFileUrl(contact?.profile_image)} 
                  name={contact?.name} 
                  fallback={<span className="text-5xl">{contact?.name?.charAt(0)}</span>}
                  className="w-28 h-28 text-large mb-3 border-4 border-primary/20 hover:border-primary shadow-xl transition-all"
                />
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{contact?.name}</h2>
                <div className="text-default-500 uppercase text-xs font-bold tracking-wider flex items-center justify-center gap-2 mt-1">
                   {contact?.role ? contact.role.replace('_', ' ') : 'Employee'}
                </div>
              </ModalHeader>
              <ModalBody className="pb-8">
                <div className="bg-default-50 dark:bg-zinc-900 rounded-2xl p-5 flex flex-col gap-4 border border-default-200 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500 font-medium">Email</span>
                    <span className="font-semibold text-foreground truncate ml-4">{contact?.email || "No email linked"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500 font-medium">Status</span>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${contact?.is_online ? 'bg-success shadow-[0_0_8px_rgba(23,201,100,0.8)]' : 'bg-default-300'}`}></div>
                       <span className="font-semibold text-foreground">{contact?.is_online ? "Active Now" : "Offline"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500 font-medium">Last Active</span>
                    <span className="font-semibold text-foreground">
                      {contact?.last_seen ? parseDate(contact.last_seen).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-divider pt-5 text-center">
                  <div className="text-xs text-default-400 mb-3 px-8 leading-relaxed">
                    Clearing chat history will permanently delete all messages sent between you and this user. This action cannot be reversed.
                  </div>
                  <Button 
                    color="danger" 
                    variant="flat" 
                    className="w-full font-bold shadow-sm"
                    size="lg"
                    startContent={<Trash2 size={18} />}
                    onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently clear all messages with ${contact?.name}?`)) {
                           if (onClearChat) onClearChat();
                           onClose();
                        }
                    }}
                  >
                    Delete All Chat History
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Group Profile Modal */}
      <Modal isOpen={isGroupModalOpen} onOpenChange={onGroupModalOpenChange} placement="center" backdrop="blur" size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                <div className="relative group">
                  <Avatar 
                    src={getFileUrl(contact?.profile_image)} 
                    name={contact?.name}
                    icon={<Users size={48} />}
                    className="w-28 h-28 text-large mb-3 border-4 border-primary/20 shadow-xl transition-all"
                  />
                  {isAdmin && (
                    <label className="absolute bottom-3 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                      <Camera size={16} />
                      <input type="file" className="hidden" onChange={handleGroupAvatarUpload} accept="image/*" />
                    </label>
                  )}
                </div>
                
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={newGroupName} 
                      onValueChange={setNewGroupName}
                      size="sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroupName()}
                    />
                    <Button size="sm" isIconOnly color="success" variant="flat" onClick={handleUpdateGroupName}>
                      <Send size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-2xl font-bold text-foreground">{contact?.name}</h2>
                    {isAdmin && (
                      <Button isIconOnly size="sm" variant="light" onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={14} /> 
                      </Button>
                    )}
                  </div>
                )}
                <span className="text-xs text-default-500 font-bold tracking-widest uppercase mt-1">Group Conversation</span>
              </ModalHeader>
              <ModalBody className="pb-8">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-sm text-default-500">Participants ({groupMembers.length})</h3>
                    {isAdmin && (
                      <Button size="sm" color="primary" variant="flat" startContent={<UserPlus size={14} />} onClick={onAddMemberOpen}>
                        Add Member
                      </Button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2">
                    {isLoadingMembers ? (
                      <div className="flex justify-center p-4"><Spinner size="sm" /></div>
                    ) : (
                      groupMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-default-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <Badge content="" color={member.is_online ? "success" : "default"} shape="circle" placement="bottom-right" size="sm" isInvisible={!member.is_online}>
                              <Avatar size="sm" src={getFileUrl(member.profile_image)} name={member.name} />
                            </Badge>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold flex items-center gap-2">
                                {member.name} {member.id === user?.id && <span className="text-[10px] bg-default-200 px-1 rounded text-default-500 font-normal">You</span>}
                              </span>
                              {member.is_admin && <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Admin</span>}
                            </div>
                          </div>
                          
                          {isAdmin && member.id !== user?.id && (
                            <Button 
                              isIconOnly 
                              size="sm" 
                              variant="light" 
                              color="danger" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-divider pt-4">
                   <Button variant="light" color="danger" className="w-full font-semibold" onClick={() => handleRemoveMember(user.id)}>
                      Leave Group
                   </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onOpenChange={onAddMemberOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add Members to Group</ModalHeader>
              <ModalBody>
                <CheckboxGroup
                  label="Select new members"
                  value={selectedToAdd}
                  onValueChange={setSelectedToAdd}
                  className="max-h-60 overflow-y-auto"
                >
                  {availableToAdd.map(c => (
                    <Checkbox key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <Avatar size="sm" src={getFileUrl(c.profile_image)} name={c.name} />
                        <span className="text-sm">{c.name}</span>
                      </div>
                    </Checkbox>
                  ))}
                  {availableToAdd.length === 0 && (
                    <p className="text-sm text-default-400 italic">No other contacts available to add.</p>
                  )}
                </CheckboxGroup>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={() => handleAddMembers(onClose)} isDisabled={selectedToAdd.length === 0}>
                  Add Selected
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
