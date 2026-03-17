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
  const [role, setRole] = useState(new Set(["team_lead"]));
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
    } catch {
      setError("Registration failed. Email might be taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-success/15 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-divider/70 bg-content1/80 backdrop-blur-xl lg:grid-cols-2">
        <div className="hidden border-r border-divider/60 p-10 lg:flex lg:flex-col lg:justify-between">
          <Logo size={44} showText textClassName="text-3xl" />
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-default-900">Build your hiring team workspace</h2>
            <p className="mt-4 text-default-600">Invite recruiters, review candidates, and move top talent through your funnel with confidence.</p>
          </div>
          <div className="rounded-2xl border border-divider/70 bg-content2/70 p-4 text-sm text-default-600">
            Role-based access ensures each team member sees exactly what they need.
          </div>
        </div>

        <Card className="relative h-full w-full rounded-none border-0 bg-transparent shadow-none">
          <CardBody className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo showText className="lg:hidden" />
            </div>
            <h1 className="text-2xl font-bold text-default-900">
              Create Account
            </h1>
            <p className="text-sm text-default-500 mt-1">Join TecnoLegacy to manage hiring efficiently</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">
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
                inputWrapper: "border border-divider/60 bg-content2/70",
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
                inputWrapper: "border border-divider/60 bg-content2/70",
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
                inputWrapper: "border border-divider/60 bg-content2/70",
              }}
            />

            <Select
              label="Role"
              placeholder="Select a role"
              selectedKeys={role}
              onSelectionChange={setRole}
              startContent={<Shield className="w-4 h-4 text-default-400" />}
              classNames={{
                trigger: "border border-divider/60 bg-content2/70",
              }}
            >
              <SelectItem key="team_lead">Team Lead</SelectItem>
              <SelectItem key="recruiter">Recruiter</SelectItem>
              <SelectItem key="admin">Admin</SelectItem>
            </Select>

            <Button
              type="submit"
              color="success"
              className="w-full mt-2 font-semibold shadow-sm"
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
    </div>
  );
}
