import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@proxy-smart/shared-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Database,
  Plus,
  Search,
  Server,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { FhirPersonAssociation } from '@/lib/types/api';
import { createPersonResource, searchPersonResources, getPersonResource } from '@/services/fhirService';

// TODO: dont use custom interfaces for backend models, use or inherit the existing generated API models instead
interface HealthcareUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  organization?: string;
  fhirPersons?: FhirPersonAssociation[];
}

interface AddFhirPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: HealthcareUser;
  onPersonAdded: (association: FhirPersonAssociation) => void;
  availableServers: Array<{
    id: string;
    name: string;
    baseUrl: string;
    status: string;
    fhirVersion?: string;
  }>;
}

export function AddFhirPersonModal({
  isOpen,
  onClose,
  user,
  onPersonAdded,
  availableServers
}: AddFhirPersonModalProps) {
  const [activeTab, setActiveTab] = useState('existing');
  const [selectedServer, setSelectedServer] = useState('');
  const [personId, setPersonId] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; display: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get servers that don't already have a Person resource for this user
  const availableServersForUser = availableServers.filter(server => 
    !(user.fhirPersons || []).some(person => person.serverId === server.id)
  );

  // Debug logging
  console.debug('📋 AddFhirPersonModal - Data Check:', {
    totalServersProvided: availableServers.length,
    availableServersProvided: availableServers.map(s => ({ name: s.name, status: s.status })),
    userFhirPersons: user.fhirPersons,
    availableServersAfterFilter: availableServersForUser.length,
    filteredServers: availableServersForUser.map(s => ({ name: s.name, status: s.status }))
  });

  const handleSearch = async () => {
    if (!selectedServer || !personId) {
      setError('Please select a server and enter a Person ID');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Find the server to get its FHIR version
      const server = availableServers.find(s => s.id === selectedServer);
      if (!server) {
        throw new Error(`Server not found: ${selectedServer}`);
      }
      
      // Search for Person by ID
      const results = await searchPersonResources(selectedServer, server.fhirVersion || 'R4', {
        _id: personId.startsWith('Person/') ? personId.substring(7) : personId
      });
      
      if (results.length === 0) {
        // Try to get the specific Person by ID
        try {
          const person = await getPersonResource(selectedServer, server.fhirVersion || 'R4', personId);
          setSearchResults([person]);
        } catch {
          setError(`Person resource not found with ID: ${personId}`);
          setSearchResults([]);
        }
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError(`Failed to search for Person resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreatePerson = async () => {
    if (!selectedServer) {
      setError('Please select a FHIR server');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Find the server to get its FHIR version
      const server = availableServers.find(s => s.id === selectedServer);
      if (!server) {
        throw new Error(`Server not found: ${selectedServer}`);
      }
      
      // Create the Person resource on the FHIR server
      const result = await createPersonResource(selectedServer, server.fhirVersion || 'R4', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
      
      const association: FhirPersonAssociation = {
        serverId: selectedServer,
        personId: result.id,
        display: result.display,
        created: new Date().toISOString()
      };

      onPersonAdded(association);
      handleClose();
    } catch (error) {
      console.error('Person creation failed:', error);
      setError(`Failed to create Person resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddExisting = (result: { id: string; display: string }) => {
    const association: FhirPersonAssociation = {
      serverId: selectedServer,
      personId: result.id,
      display: result.display,
      created: new Date().toISOString()
    };

    onPersonAdded(association);
    handleClose();
  };

  const handleClose = () => {
    setActiveTab('existing');
    setSelectedServer('');
    setPersonId('');
    setSearchResults([]);
    setError(null);
    onClose();
  };

  if (availableServersForUser.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-600">
              No Available Servers
            </DialogTitle>
            <DialogDescription>
              This user already has Person resources on all available FHIR servers.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">All Servers Used</h4>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              {user.firstName} {user.lastName} already has Person resources on all available FHIR servers:
            </p>
            <div className="space-y-2">
              {(user.fhirPersons || []).map((person, index) => {
                const serverName = availableServers.find(s => s.id === person.serverId)?.name || person.serverId;
                return (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Server className="w-4 h-4 text-amber-600" />
                    <span className="font-medium">{serverName}:</span>
                    <span className="font-mono">{person.personId}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                Add FHIR Person Resource
              </DialogTitle>
              <DialogDescription className="text-gray-600 font-medium mt-1">
                Associate {user.firstName} {user.lastName} with a Person resource on a FHIR server
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Server Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>Select FHIR Server</span>
            </CardTitle>
            <CardDescription>
              Choose which FHIR server to add the Person resource to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a FHIR server" />
              </SelectTrigger>
              <SelectContent>
                {availableServersForUser.map(server => (
                  <SelectItem key={server.name} value={server.name}>
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4" />
                      <span>{server.name}</span>
                      <Badge variant={server.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {server.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedServer && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/50">
              <TabsTrigger value="existing" className="rounded-xl">Link Existing Person</TabsTrigger>
              <TabsTrigger value="create" className="rounded-xl">Create New Person</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="w-5 h-5" />
                    <span>Find Existing Person Resource</span>
                  </CardTitle>
                  <CardDescription>
                    Enter the Person resource ID to link to this user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Person Resource ID</Label>
                      <Input
                        placeholder="e.g., Person/12345 or just 12345"
                        value={personId}
                        onChange={(e) => setPersonId(e.target.value)}
                        className="rounded-xl mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <Button
                        onClick={handleSearch}
                        disabled={!selectedServer || !personId || isSearching}
                        className="px-6 py-2 rounded-xl"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Search Results</h4>
                      {searchResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium text-gray-900">{result.display}</p>
                              <p className="text-sm text-gray-600">Person ID: {result.id}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddExisting(result)}
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add This Person
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Create New Person Resource</span>
                  </CardTitle>
                  <CardDescription>
                    Create a new Person resource on {selectedServer} for this user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-medium text-blue-900 mb-2">Person Resource Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Name:</span> {user.firstName} {user.lastName}
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Email:</span> {user.email}
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Username:</span> {user.username}
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Organization:</span> {user.organization || 'Not specified'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleCreatePerson}
                      disabled={isCreating}
                      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Person Resource...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Create Person Resource
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end pt-6 border-t">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}