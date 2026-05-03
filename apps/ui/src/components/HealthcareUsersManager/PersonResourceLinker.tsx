import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import {
  Link,
  User,
  Database,
  Plus,
  Trash2,
  ExternalLink,
  Users,
  Stethoscope,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  type PersonResource, 
  type LinkedResourceType, 
  type AssuranceLevel, 
  type CustomPersonLink,
  validateFhirReference 
} from '@/lib/fhir-types';
import { useTranslation } from 'react-i18next';

interface PersonResourceLinkerProps {
  availablePersons?: PersonResource[];
  onPersonUpdate: (personId: string, updatedLinks: CustomPersonLink[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PersonResourceLinker({ 
  availablePersons = [], 
  onPersonUpdate, 
  isOpen, 
  onClose 
}: PersonResourceLinkerProps) {
  const { t } = useTranslation();
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLink, setNewLink] = useState<Partial<CustomPersonLink>>({
    target: {
      resourceType: 'Patient',
      reference: '',
      display: ''
    },
    assurance: 'level2',
    notes: ''
  });

  const selectedPerson = availablePersons?.find(p => (p.id || p.display) === selectedPersonId);

  // Get resource type icon
  const getResourceTypeIcon = (resourceType: LinkedResourceType) => {
    switch (resourceType) {
      case 'Patient':
        return <User className="w-4 h-4" />;
      case 'Practitioner':
        return <Stethoscope className="w-4 h-4" />;
      case 'RelatedPerson':
        return <Users className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  // Get assurance level color
  const getAssuranceLevelColor = (level: AssuranceLevel) => {
    switch (level) {
      case 'level1':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'level2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'level3':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'level4':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Add new link
  const handleAddLink = () => {
    if (!selectedPerson || !newLink.target?.reference || !newLink.target?.resourceType) {
      return;
    }

    // Validate FHIR reference format
    if (!validateFhirReference(newLink.target.reference, newLink.target.resourceType)) {
      // You might want to show an error message here
      console.error('Invalid FHIR reference format');
      return;
    }

    const link: CustomPersonLink = {
      id: crypto.randomUUID(),
      target: {
        resourceType: newLink.target.resourceType as LinkedResourceType,
        reference: newLink.target.reference,
        display: newLink.target.display || newLink.target.reference
      },
      assurance: newLink.assurance as AssuranceLevel,
      created: new Date().toISOString(),
      notes: newLink.notes
    };

    const updatedLinks = [...selectedPerson.links, link];
    onPersonUpdate(selectedPerson.id || selectedPerson.display, updatedLinks);
    setShowAddLinkForm(false);
    resetNewLinkForm();
  };

  // Remove link
  const handleRemoveLink = (linkId: string) => {
    if (!selectedPerson) return;
    
    const updatedLinks = selectedPerson.links.filter((link: CustomPersonLink) => link.id !== linkId);
    onPersonUpdate(selectedPerson.id || selectedPerson.display, updatedLinks);
  };

  // Reset new link form
  const resetNewLinkForm = () => {
    setNewLink({
      target: {
        resourceType: 'Patient',
        reference: '',
        display: ''
      },
      assurance: 'level2',
      notes: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Link className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Person Resource Linker')}
              </DialogTitle>
              <DialogDescription className="text-gray-600 font-medium mt-1">
                {t('Link Person resources to other FHIR resources on the same server')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Select Person Resource */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{t('1. Select Person Resource')}</span>
            </CardTitle>
            <CardDescription>
              {t('Choose which Person resource to manage links for')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t('Select a Person resource')} />
              </SelectTrigger>
              <SelectContent>
                {availablePersons.map((person) => (
                  <SelectItem key={person.id || person.display} value={person.id || person.display}>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{person.display}</span>
                      <Badge variant="outline" className="text-xs">
                        {person.serverInfo.serverName}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                        {person.serverInfo.version}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPerson && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">
                      {selectedPerson.display.split(' (')[0]} {/* Extract name without the ID part */}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        <strong>{t('Server:')}</strong> {selectedPerson.serverInfo.serverName}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>{t('Person ID:')}</strong> {selectedPerson.id || 'N/A'}
                    </p>
                    <p className="text-xs text-blue-600">
                      <strong>{t('FHIR Version:')}</strong> {selectedPerson.serverInfo.version}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      {selectedPerson.links.length} links
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Manage Links (only show if person is selected) */}
        {selectedPerson && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Link className="w-5 h-5" />
                    <span>2. Manage Resource Links</span>
                  </CardTitle>
                  <CardDescription>
                    Add or remove links to other resources on {selectedPerson.serverInfo.serverName}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddLinkForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Add Link')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Link Form */}
              {showAddLinkForm && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <h4 className="font-semibold text-green-900 mb-4">{t('Add New Resource Link')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('Resource Type')}</Label>
                      <Select
                        value={newLink.target?.resourceType}
                        onValueChange={(value) => {
                          const currentId = newLink.target?.reference?.split('/')[1] || '';
                          const newReference = currentId ? `${value}/${currentId}` : '';
                          setNewLink((prev: Partial<CustomPersonLink>) => ({
                            ...prev,
                            target: { 
                              ...prev.target!, 
                              resourceType: value as LinkedResourceType,
                              reference: newReference
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={t('Select resource type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Patient">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>{t('Patient')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Practitioner">
                            <div className="flex items-center space-x-2">
                              <Stethoscope className="w-4 h-4" />
                              <span>{t('Practitioner')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="RelatedPerson">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>{t('RelatedPerson')}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">{t('Assurance Level')}</Label>
                      <Select
                        value={newLink.assurance}
                        onValueChange={(value) => setNewLink((prev: Partial<CustomPersonLink>) => ({
                          ...prev,
                          assurance: value as AssuranceLevel
                        }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="level1">{t('Level 1 - Little confidence')}</SelectItem>
                          <SelectItem value="level2">{t('Level 2 - Some confidence')}</SelectItem>
                          <SelectItem value="level3">{t('Level 3 - High confidence')}</SelectItem>
                          <SelectItem value="level4">{t('Level 4 - Very high confidence')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium">{t('Resource ID')}</Label>
                    <Input
                      placeholder="e.g., 123 or 456"
                      value={newLink.target?.reference?.split('/')[1] || ''}
                      onChange={(e) => {
                        const resourceType = newLink.target?.resourceType || 'Patient';
                        const fullReference = e.target.value ? `${resourceType}/${e.target.value}` : '';
                        setNewLink((prev: Partial<CustomPersonLink>) => ({
                          ...prev,
                          target: { ...prev.target!, reference: fullReference }
                        }));
                      }}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Enter just the ID that exists on {selectedPerson.serverInfo.serverName}
                    </p>
                    {newLink.target?.reference && (
                      <p className="text-xs text-blue-600 mt-1">
                        <strong>{t('Full reference:')}</strong> {newLink.target.reference}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium">{t('Display name (optional)')}</Label>
                    <Input
                      placeholder="e.g., John Doe or Dr. Smith"
                      value={newLink.target?.display}
                      onChange={(e) => setNewLink((prev: Partial<CustomPersonLink>) => ({
                        ...prev,
                        target: { ...prev.target!, display: e.target.value }
                      }))}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium">{t('Notes (Optional)')}</Label>
                    <Input
                      placeholder={t('Additional notes about this link...')}
                      value={newLink.notes}
                      onChange={(e) => setNewLink((prev: Partial<CustomPersonLink>) => ({ ...prev, notes: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <Button
                      onClick={handleAddLink}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('Add Link')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddLinkForm(false);
                        resetNewLinkForm();
                      }}
                      className="px-6 py-2 rounded-xl"
                    >
                      {t('Cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Links */}
              {selectedPerson.links.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">{t('Existing Links')}</h4>
                  {selectedPerson.links.map((link: CustomPersonLink) => (
                    <div key={link.id} className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            {getResourceTypeIcon(link.target.resourceType)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-semibold text-foreground">
                                {link.target.display || link.target.reference}
                              </h5>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="text-sm text-gray-600">
                              {link.target.resourceType} • {link.target.reference}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={`text-xs ${getAssuranceLevelColor(link.assurance)}`}>
                                {link.assurance.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Added {new Date(link.created).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${selectedPerson.serverInfo.baseUrl}/${link.target.reference}`, '_blank')}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLink(link.id)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {link.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600 italic">{link.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('No links yet')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Link this Person to other resources on {selectedPerson.serverInfo.serverName}
                  </p>
                  <Button
                    onClick={() => setShowAddLinkForm(true)}
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('Add First Link')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show message if no person selected */}
        {!selectedPerson && (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('Select a Person Resource')}
              </h3>
              <p className="text-gray-600">
                {t('Choose a Person resource above to manage its links to other FHIR resources')}
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}