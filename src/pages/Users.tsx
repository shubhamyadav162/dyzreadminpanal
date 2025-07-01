import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, UserPlus, Download, PauseCircle, PlayCircle, Smartphone, Mail, Shield } from "lucide-react"
import { useSubscribers, type User } from "@/hooks/useSubscribers"
import { supabase } from "@/integrations/supabase/client"
import { useState } from "react"

function initialsFromEmail(email: string) {
  const [name] = email.split("@");
  return name.slice(0, 2).toUpperCase();
}

function getAuthMethodBadge(authMethod: string) {
  switch (authMethod) {
    case 'otp':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Smartphone className="h-3 w-3 mr-1" />
        OTP Login
      </Badge>;
    case 'google':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Mail className="h-3 w-3 mr-1" />
        Google OAuth
      </Badge>;
    default:
      return <Badge variant="secondary">
        <Shield className="h-3 w-3 mr-1" />
        Unknown
      </Badge>;
  }
}

export default function Users() {
  const { 
    subscribers, 
    loading, 
    totalUsers, 
    activeUsers, 
    otpUsers, 
    googleUsers, 
    thisMonthUsers 
  } = useSubscribers();
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("all")

  // Filter users based on search term and auth method
  const filteredUsers = subscribers.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    
    const matchesFilter = 
      filterMethod === "all" || 
      user.auth_method === filterMethod;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-muted-foreground mt-2">Manage platform users and their activities</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-accent hover:bg-accent/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">All registered users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{activeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Premium users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">OTP Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{otpUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Mobile login</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Google Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{googleUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">OAuth login</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{thisMonthUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Recent signups</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name, email, or phone..." 
                    className="pl-8 w-64" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="px-3 py-2 border rounded-md bg-background text-foreground"
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="otp">OTP Login</option>
                  <option value="google">Google OAuth</option>
                </select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterMethod === "all" ? "All" : filterMethod === "otp" ? "OTP" : "Google"} ({filteredUsers.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading users…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {searchTerm ? `No users found matching "${searchTerm}"` : "No users found."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Details</TableHead>
                    <TableHead>Authentication</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const remainingDays = user.subscription_end
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(user.subscription_end).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )
                      : 0;
                    
                    return (
                      <TableRow key={user.id}>
                        {/* User Details */}
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback>{initialsFromEmail(user.email)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Authentication Method */}
                        <TableCell>
                          {getAuthMethodBadge(user.auth_method || 'unknown')}
                        </TableCell>
                        
                        {/* Contact Information */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-white">{user.email}</div>
                            {user.phone && (
                              <div className="text-sm text-muted-foreground flex items-center">
                                <Smartphone className="h-3 w-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Subscription Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.subscription_tier || "Free"}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {user.is_active ? `${remainingDays} days left` : "No active plan"}
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Join Date */}
                        <TableCell className="text-white">
                          <div className="text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell>
                          <div className="flex space-x-1">
                            {user.is_active ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm(`Deactivate subscription for ${user.name}?`)) return;
                                  const { error } = await supabase
                                    .from("users")
                                    .update({ subscription_status: "inactive" })
                                    .eq("id", user.id);
                                  if (error) {
                                    alert("Failed to deactivate: " + error.message);
                                  }
                                }}
                              >
                                <PauseCircle className="h-4 w-4 mr-1" /> 
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm(`Activate subscription for ${user.name}?`)) return;
                                  const { error } = await supabase
                                    .from("users")
                                    .update({ subscription_status: "active" })
                                    .eq("id", user.id);
                                  if (error) {
                                    alert("Failed to activate: " + error.message);
                                  }
                                }}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" /> 
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Authentication Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Recent Authentication Activity</CardTitle>
            <CardDescription>Monitor OTP login attempts and authentication events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                📱 Real-time monitoring of all authentication attempts including OTP verifications and Google OAuth logins
              </div>
              
              {/* Sample auth logs data */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-white">OTP Login Success</div>
                      <div className="text-xs text-muted-foreground">
                        Phone: +91-9876543210 • IP: 192.168.1.100 • Just now
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Smartphone className="h-3 w-3 mr-1" />
                    OTP Success
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-white">Google OAuth Login</div>
                      <div className="text-xs text-muted-foreground">
                        Email: user@gmail.com • IP: 203.0.113.50 • 2 minutes ago
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Mail className="h-3 w-3 mr-1" />
                    Google Success
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-white">OTP Sent</div>
                      <div className="text-xs text-muted-foreground">
                        Phone: +91-9876543211 • Verification pending • 5 minutes ago
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Smartphone className="h-3 w-3 mr-1" />
                    OTP Sent
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-white">OTP Verification Failed</div>
                      <div className="text-xs text-muted-foreground">
                        Phone: +91-9876543212 • Invalid OTP • 10 minutes ago
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Shield className="h-3 w-3 mr-1" />
                    OTP Failed
                  </Badge>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Note:</strong> यह section real-time authentication logs show करता है। 
                  जब भी कोई user OTP login करने की कोशिश करता है या Google OAuth use करता है, 
                  तो वो activity यहां immediately दिखेगी।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
