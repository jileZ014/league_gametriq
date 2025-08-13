'use client';

import React, { useState } from 'react';
import { CoachLayout } from '@/components/coach/CoachLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  id: string;
  type: 'announcement' | 'direct' | 'urgent';
  subject: string;
  content: string;
  sender: string;
  recipient?: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

interface Document {
  id: string;
  name: string;
  type: 'playbook' | 'schedule' | 'roster' | 'forms';
  size: string;
  uploadedDate: string;
  downloads: number;
}

export default function MessagesPage() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageType, setMessageType] = useState<'announcement' | 'direct'>('announcement');

  // Mock data
  const messages: Message[] = [
    {
      id: '1',
      type: 'urgent',
      subject: 'Game Time Change - Tomorrow',
      content: 'Tomorrow\'s game against Desert Storm has been moved to 4:00 PM due to venue scheduling conflicts. Please arrive by 3:15 PM for warm-ups.',
      sender: 'Coach Martinez',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'announcement',
      subject: 'Practice Schedule for Next Week',
      content: 'Team practice will be held on Monday, Wednesday, and Friday at 4:00 PM. Focus will be on defensive drills and free throw shooting.',
      sender: 'Coach Martinez',
      timestamp: '1 day ago',
      read: true,
    },
    {
      id: '3',
      type: 'direct',
      subject: 'Michael\'s Performance',
      content: 'Hi Coach, I wanted to discuss Michael\'s recent performance and see if we can schedule extra practice time for him.',
      sender: 'Parent - Johnson',
      recipient: 'Coach Martinez',
      timestamp: '2 days ago',
      read: true,
    },
    {
      id: '4',
      type: 'announcement',
      subject: 'Tournament Registration Complete',
      content: 'We are officially registered for the Phoenix Championship Tournament on January 20-21. Tournament brackets will be released next week.',
      sender: 'Coach Martinez',
      timestamp: '3 days ago',
      read: true,
      attachments: ['tournament_info.pdf'],
    },
  ];

  const documents: Document[] = [
    {
      id: '1',
      name: 'Team Playbook 2024.pdf',
      type: 'playbook',
      size: '2.4 MB',
      uploadedDate: '2024-01-01',
      downloads: 45,
    },
    {
      id: '2',
      name: 'Practice Schedule January.xlsx',
      type: 'schedule',
      size: '156 KB',
      uploadedDate: '2024-01-05',
      downloads: 32,
    },
    {
      id: '3',
      name: 'Team Roster & Contacts.pdf',
      type: 'roster',
      size: '512 KB',
      uploadedDate: '2024-01-03',
      downloads: 28,
    },
    {
      id: '4',
      name: 'Medical Release Forms.pdf',
      type: 'forms',
      size: '1.1 MB',
      uploadedDate: '2023-12-28',
      downloads: 15,
    },
  ];

  const recipients = [
    { id: 'all', name: 'All Team Members' },
    { id: 'parents', name: 'All Parents' },
    { id: 'players', name: 'All Players' },
    { id: 'staff', name: 'Coaching Staff' },
  ];

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'direct':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'playbook':
        return '📘';
      case 'schedule':
        return '📅';
      case 'roster':
        return '👥';
      case 'forms':
        return '📝';
      default:
        return '📄';
    }
  };

  return (
    <CoachLayout title="Team Communication" subtitle="Messages, Announcements & Documents">
      <Tabs defaultValue="inbox" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message List */}
            <div className="lg:col-span-1">
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Messages</CardTitle>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      onClick={() => setComposeOpen(true)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Compose
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => setSelectedMessage(message)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedMessage?.id === message.id
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700/70'
                        } ${!message.read ? 'border-l-4 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {getMessageTypeIcon(message.type)}
                            <span className="text-sm font-medium text-white">
                              {message.subject}
                            </span>
                          </div>
                          {!message.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">{message.sender}</span>
                          <span className="text-xs text-gray-500">{message.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMessageTypeIcon(selectedMessage.type)}
                          <CardTitle className="text-white">{selectedMessage.subject}</CardTitle>
                        </div>
                        <Badge className={`${
                          selectedMessage.type === 'urgent' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : selectedMessage.type === 'direct'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {selectedMessage.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>From: {selectedMessage.sender}</span>
                        <span>{selectedMessage.timestamp}</span>
                      </div>
                      {selectedMessage.recipient && (
                        <div className="text-sm text-gray-400">
                          To: {selectedMessage.recipient}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-gray-300 whitespace-pre-wrap">
                        {selectedMessage.content}
                      </div>
                      
                      {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                        <div className="pt-4 border-t border-gray-700">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Attachments</h4>
                          <div className="space-y-2">
                            {selectedMessage.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm text-gray-300">{attachment}</span>
                                </div>
                                <Button size="sm" variant="ghost">
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Reply
                        </Button>
                        <Button variant="outline">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                          </svg>
                          Forward
                        </Button>
                        <Button variant="ghost" className="text-red-400">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <p className="text-gray-400">Select a message to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sent" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Sent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages
                  .filter(m => m.sender === 'Coach Martinez')
                  .map((message) => (
                    <div key={message.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            {getMessageTypeIcon(message.type)}
                            <span className="text-white font-medium">{message.subject}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2">{message.content}</p>
                        </div>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Team Documents</CardTitle>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                        <div>
                          <h4 className="text-white font-medium">{doc.name}</h4>
                          <p className="text-xs text-gray-400">{doc.size} • Uploaded {doc.uploadedDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {doc.downloads} downloads
                      </span>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                        <Button size="sm" variant="ghost">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Compose Message</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setComposeOpen(false)}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Message Type</Label>
                  <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="direct">Direct Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recipients</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Subject</Label>
                <Input placeholder="Enter message subject" className="bg-gray-700/50 border-gray-600" />
              </div>
              
              <div>
                <Label>Message</Label>
                <Textarea 
                  placeholder="Type your message here..." 
                  className="bg-gray-700/50 border-gray-600 min-h-[200px]"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                  Attach File
                </Button>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                    Send Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </CoachLayout>
  );
}