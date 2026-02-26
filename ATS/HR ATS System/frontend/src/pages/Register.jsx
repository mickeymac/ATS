import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { 
  Card, 
  CardBody, 
  Input, 
  Button,
  Select,
  SelectItem
} from "@nextui-org/react";
import { Mail, Lock, User, Shield, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(new Set(["hr"]));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password, Array.from(role)[0]);
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Email might be taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-success/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md mx-4 border border-divider">
        <CardBody className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <h1 className="text-2xl font-bold text-default-900">
              Create Account
            </h1>
            <p className="text-sm text-default-500 mt-1">Join TecnoLegacy to manage hiring efficiently</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-danger text-sm mb-4 text-center bg-danger/10 py-2 px-4 rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              placeholder="John Doe"
              value={name}
              onValueChange={setName}
              startContent={<User className="w-4 h-4 text-default-400" />}
              isRequired
              classNames={{
                inputWrapper: "bg-default-100",
              }}
            />

            <Input
              type="email"
              label="Email"
              placeholder="you@company.com"
              value={email}
              onValueChange={setEmail}
              startContent={<Mail className="w-4 h-4 text-default-400" />}
              isRequired
              classNames={{
                inputWrapper: "bg-default-100",
              }}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onValueChange={setPassword}
              startContent={<Lock className="w-4 h-4 text-default-400" />}
              isRequired
              classNames={{
                inputWrapper: "bg-default-100",
              }}
            />

            <Select
              label="Role"
              placeholder="Select a role"
              selectedKeys={role}
              onSelectionChange={setRole}
              startContent={<Shield className="w-4 h-4 text-default-400" />}
              classNames={{
                trigger: "bg-default-100",
              }}
            >
              <SelectItem key="hr">HR</SelectItem>
              <SelectItem key="admin">Admin</SelectItem>
            </Select>

            <Button
              type="submit"
              color="success"
              className="w-full mt-2"
              isLoading={loading}
              endContent={!loading && <ArrowRight className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-default-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
