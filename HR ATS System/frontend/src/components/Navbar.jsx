import { Bell, Search } from 'lucide-react';
import { 
  Input, 
  Avatar, 
  Badge, 
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Card,
  CardBody
} from '@nextui-org/react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-divider bg-background/60 px-6 backdrop-blur-md">
      <div className="relative flex w-full max-w-sm items-center">
        <Input
          classNames={{
            base: "max-w-full sm:max-w-[20rem] h-10",
            mainWrapper: "h-full",
            input: "text-small",
            inputWrapper: "h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20",
          }}
          placeholder="Type to search..."
          size="sm"
          startContent={<Search size={18} />}
          type="search"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </div>

      <div className="flex items-center gap-4">
        <Popover placement="bottom-end" offset={20} showArrow>
          <PopoverTrigger>
            <Button isIconOnly variant="light" className="text-default-600">
              <Badge content={3} color="danger" shape="circle" size="sm">
                <Bell size={20} />
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Card className="border-none shadow-none">
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-default-900">Notifications</h4>
                  <Button size="sm" variant="light" className="text-primary">Mark all read</Button>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-default-100 cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-900">New application received</p>
                      <p className="text-xs text-default-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-default-100 cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-default-900">Interview scheduled</p>
                      <p className="text-xs text-default-500">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </PopoverContent>
        </Popover>

        {user && (
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <Avatar 
              src={`https://i.pravatar.cc/150?u=${user.email}`}
              size="sm"
              name={user.email?.charAt(0).toUpperCase()}
            />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-default-900">{user.email}</p>
              <p className="text-xs text-default-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
