import React from "react";
import { useTheme } from "@cham-lang/ui/contexts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@cham-lang/ui/components/atoms";
import { TopBar } from "@cham-lang/ui/components/molecules";
import {
  Bell,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";

export const ThemePreviewPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <TopBar title="Theme Preview" showBack={true} />
      <div className="min-h-screen px-4 md:px-8 py-8 pb-24 space-y-8">
        {/* Header Control */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--color-bg-white)] p-6 rounded-3xl border border-[var(--color-border-light)] backdrop-blur-md shadow-lg">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Current Theme: <span className="capitalize">{theme}</span>
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Toggle themes to verify component adaptability
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "primary" : "outline"}
              onClick={() => setTheme("light")}
              size="sm"
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "outline"}
              onClick={() => setTheme("dark")}
              size="sm"
            >
              Dark
            </Button>
            <Button
              variant={theme === "chameleon" ? "primary" : "outline"}
              onClick={() => setTheme("chameleon")}
              size="sm"
            >
              Chameleon
            </Button>
            <Button
              variant={theme === "simple" ? "primary" : "outline"}
              onClick={() => setTheme("simple")}
              size="sm"
            >
              Simple
            </Button>
          </div>
        </div>

        {/* Buttons Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Buttons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="success">Success</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="glass">Glass</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sizes & Icons</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4">
                <Button size="xs">XS</Button>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button icon={Bell}>With Icon</Button>
                <Button icon={Search} iconPosition="right" variant="secondary">
                  Right Icon
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>States</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button disabled>Disabled Primary</Button>
                <Button variant="outline" disabled>
                  Disabled Outline
                </Button>
                <Button className="w-full">Full Width</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Form Elements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <Input label="Default Input" placeholder="Type something..." />
                <Input
                  label="With Icon"
                  icon={Search}
                  placeholder="Search..."
                />
                <Input
                  label="Error State"
                  error="This field is required"
                  defaultValue="Invalid input"
                />
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardHeader>
                <CardTitle>On Glass Background</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Input on glass card" />
                <div className="flex gap-2">
                  <Button size="sm">Submit</Button>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cards Variants */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Card Variants
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="clay-peach">
              <CardContent className="pt-6 font-bold text-gray-700">
                Clay Peach
              </CardContent>
            </Card>
            <Card variant="clay-blue">
              <CardContent className="pt-6 font-bold text-gray-700">
                Clay Blue
              </CardContent>
            </Card>
            <Card variant="clay-mint">
              <CardContent className="pt-6 font-bold text-gray-700">
                Clay Mint
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="pt-6 font-bold text-white">
                Gradient
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography & Colors */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Typography & Icons
          </h3>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
                Heading 1
              </h1>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
                Heading 2
              </h2>
              <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Heading 3
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                This is body text. The quick brown fox jumps over the lazy dog.
                It should utilize the secondary text color variable.
              </p>
              <p className="text-[var(--color-text-muted)] text-sm">
                This is muted text used for captions and hints.
              </p>

              <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-2 text-[var(--color-primary-600)]">
                  <Info /> <span>Primary Info</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle /> <span>Success</span>
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle /> <span>Warning</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Clock /> <span>Muted Icon</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};
