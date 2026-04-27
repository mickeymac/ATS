import React, { useState } from 'react';
import { Avatar, Input, Badge, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, CheckboxGroup, Checkbox, useDisclosure } from '@nextui-org/react';
import { Search, Users, UserPlus } from 'lucide-react';
import { createGroup } from '../../services/chatService';

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

export default function ChatSidebar({ contacts, activeContactId, onSelectContact, searchQuery, setSearchQuery, onGroupCreated }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const filteredContacts = contacts.filter(c => 
    c.type === 'user' && (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const allContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateGroup = async (onClose) => {
    if (!groupName || selectedMembers.length === 0) return;
    
    setIsCreating(true);
    try {
      await createGroup({
        name: groupName,
        members: selectedMembers
      });
      setGroupName('');
      setSelectedMembers([]);
      onClose();
      if (onGroupCreated) onGroupCreated();
    } catch (error) {
      console.error('Failed to create group', error);
      alert('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full md:w-80 border-r border-default-200 flex flex-col h-full bg-default-50">
      <div className="p-4 border-b border-default-200 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Chats</h2>
          <Button 
            isIconOnly 
            size="sm" 
            variant="flat" 
            color="primary" 
            onPress={onOpen}
            title="Create Group"
          >
            <UserPlus size={18} />
          </Button>
        </div>
        <Input
          placeholder="Search contacts..."
          startContent={<Search size={18} className="text-default-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
          size="sm"
          variant="faded"
          radius="lg"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto hidden-scrollbar">
        {allContacts.map(contact => (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
              activeContactId === contact.id ? 'bg-primary/10' : 'hover:bg-default-100'
            }`}
          >
            <Badge 
              content="" 
              color={contact.type === 'group' ? "primary" : "success"}
              shape="circle" 
              placement="bottom-right"
              isInvisible={contact.type === 'group' ? false : !contact.is_online}
            >
              <Avatar
                src={getFileUrl(contact.profile_image)}
                name={contact.name}
                icon={contact.type === 'group' ? <Users size={20} /> : undefined}
                fallback={<span className="font-semibold">{contact.name.charAt(0)}</span>}
              />
            </Badge>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm truncate">{contact.name}</span>
                {contact.last_message_time && (
                  <span className="text-xs text-default-400 whitespace-nowrap">
                    {parseDate(contact.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-default-500 truncate min-w-0 flex-1">
                  {contact.last_message ? contact.last_message : 'No messages yet'}
                </span>
                {contact.unread_count > 0 && contact.id !== activeContactId && (
                  <span className="bg-primary text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {contact.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {allContacts.length === 0 && (
          <div className="p-4 text-center text-default-400 text-sm">
            No contacts found
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Create New Group</ModalHeader>
              <ModalBody>
                <Input
                  label="Group Name"
                  placeholder="Enter group name"
                  variant="bordered"
                  value={groupName}
                  onValueChange={setGroupName}
                />
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Select Members</p>
                  <CheckboxGroup
                    value={selectedMembers}
                    onValueChange={setSelectedMembers}
                    className="max-h-60 overflow-y-auto"
                  >
                    {filteredContacts.map(user => (
                      <Checkbox key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" src={getFileUrl(user.profile_image)} name={user.name} />
                          <span className="text-sm">{user.name}</span>
                        </div>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => handleCreateGroup(onClose)}
                  isLoading={isCreating}
                  isDisabled={!groupName || selectedMembers.length === 0}
                >
                  Create
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
