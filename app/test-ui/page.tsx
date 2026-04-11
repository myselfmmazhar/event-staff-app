'use client'

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Label,
  Badge,
  toast,
  Spinner,
  Skeleton,
  SkeletonCard,
  UserIcon,
  UsersIcon,
  SettingsIcon,
  CalendarIcon,
  DashboardIcon,
} from '@/components/ui'

export default function TestUIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-900 dark:text-purple-300 mb-2">
            UI Components Test Page
          </h1>
          <p className="text-muted-foreground">
            Testing all Phase 6 UI components
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Different button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="premium">Premium</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button isLoading>Loading...</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Inputs</CardTitle>
            <CardDescription>Input fields with labels and validation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="email" requiredMark>
                  Email Address
                </Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
              <div>
                <Label htmlFor="invalid">Invalid Input</Label>
                <Input id="invalid" invalid placeholder="This has an error" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status and role indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="success" dot>
                Active
              </Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="danger">Cancelled</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="purple">ADMIN</Badge>
              <Badge variant="primary">MANAGER</Badge>
              <Badge variant="secondary">STAFF</Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Toast */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>Click buttons to show notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  toast({ message: 'Success! Your action was completed.', type: 'success' })
                }
                variant="outline"
              >
                Show Success
              </Button>
              <Button
                onClick={() =>
                  toast({ message: 'Error! Something went wrong.', type: 'error' })
                }
                variant="outline"
              >
                Show Error
              </Button>
              <Button
                onClick={() =>
                  toast({ message: 'Info: This is an informational message.', type: 'info' })
                }
                variant="outline"
              >
                Show Info
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Spinners and skeleton loaders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-2">Spinners:</p>
                <div className="flex items-center gap-4">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="xl" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Skeleton Loaders:</p>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Skeleton Card:</p>
                <SkeletonCard />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Icons */}
        <Card>
          <CardHeader>
            <CardTitle>Icons</CardTitle>
            <CardDescription>Icon library for the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col items-center gap-2">
                <UserIcon className="h-6 w-6 text-purple-600" />
                <span className="text-xs">User</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <UsersIcon className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Users</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Settings</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Calendar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <DashboardIcon className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Dashboard</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Example 1</CardTitle>
              <CardDescription>This is a standard card</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards have a glassmorphism effect on hover.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Example 2</CardTitle>
              <CardDescription>Another card example</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards are responsive and work in dark mode.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Primary</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Example 3</CardTitle>
              <CardDescription>Third card demo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All components follow the purple/rose theme.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
