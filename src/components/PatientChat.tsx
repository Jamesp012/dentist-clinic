import { useState } from 'react';
import { Patient, ChatMessage } from '../App';
import { MessageCircle, Send, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

type PatientChatProps = {
  patients: Patient[];
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  currentUserId: string;
};

export function PatientChat({ patients, chatMessages, setChatMessages, currentUserId }: PatientChatProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Get unique patients who have chat history
  const patientsWithChats = patients.filter(patient =>
    chatMessages.some(msg => String(msg.patientId) === String(patient.id))
  );

  // Add patients without chats to the list
  const allChatPatients = [
    ...patientsWithChats,
    ...patients.filter(p => !patientsWithChats.find(pc => String(pc.id) === String(p.id)))
  ];

  const selectedPatient = allChatPatients.find(p => String(p.id) === String(selectedPatientId));

  const selectedPatientMessages = selectedPatientId
    ? chatMessages
        .filter(msg => String(msg.patientId) === String(selectedPatientId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  // Get unread count for each patient
  const getUnreadCount = (patientId: string) => {
    return chatMessages.filter(
      msg => String(msg.patientId) === String(patientId) && !msg.read && msg.senderRole === 'patient'
    ).length;
  };

  // Mark messages as read when viewing
  const markAsRead = (patientId: string) => {
    setChatMessages(
      chatMessages.map(msg =>
        String(msg.patientId) === String(patientId) && msg.senderRole === 'patient'
          ? { ...msg, read: true }
          : msg
      )
    );
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    markAsRead(patientId);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPatientId) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      patientId: selectedPatientId,
      senderId: currentUserId,
      senderName: 'Assistant',
      senderRole: 'assistant',
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setChatMessages([...chatMessages, message]);
    setNewMessage('');
    toast.success('Message sent!');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Patient Chat</h1>
        <p className="text-gray-600">Communicate with patients in real-time</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)] flex">
        {/* Patient List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {allChatPatients.map(patient => {
              const unreadCount = getUnreadCount(patient.id);
              const lastMessage = chatMessages
                .filter(msg => String(msg.patientId) === String(patient.id))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

              return (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedPatientId === patient.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{patient.name}</p>
                        {lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            {lastMessage.senderRole === 'assistant' ? 'You: ' : ''}
                            {lastMessage.message}
                          </p>
                        )}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-gray-500 ml-13">{formatTime(lastMessage.timestamp)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedPatient ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {selectedPatientMessages.map(message => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.senderRole === 'assistant' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          message.senderRole === 'assistant'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm mb-1">{message.message}</p>
                        <p
                          className={`text-xs ${
                            message.senderRole === 'assistant' ? 'text-blue-100' : 'text-gray-600'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {selectedPatientMessages.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start a conversation with {selectedPatient.name}</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">Select a patient to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
