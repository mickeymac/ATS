import { Link } from 'react-router-dom';
import { Card, CardBody, Button } from '@nextui-org/react';
import { ShieldAlert, Home, LayoutDashboard } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border border-divider">
        <CardBody className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-danger" />
          </div>
          <h1 className="text-xl font-bold text-default-900">Unauthorized Access</h1>
          <p className="mt-2 text-sm text-default-600">
            You don't have permission to access this page.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button
              as={Link}
              to="/dashboard"
              color="primary"
              startContent={<LayoutDashboard size={16} />}
            >
              Go to dashboard
            </Button>
            <Button
              as={Link}
              to="/"
              variant="bordered"
              startContent={<Home size={16} />}
            >
              Back to home
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Unauthorized;
