import { useState, useEffect, useCallback } from 'react';
import {
  getTeams,
  getTeamMembers,
  createTeam,
  inviteToTeam,
  removeFromTeam,
  updateMemberRole,
  type Team,
  type TeamMember,
} from '../../lib/supabase/sharing';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  programName: string;
  currentTeamId?: string | null;
  onTeamChange?: (teamId: string | null) => void;
}

export function ShareDialog({
  isOpen,
  onClose,
  programId: _programId,
  programName,
  currentTeamId,
  onTeamChange,
}: ShareDialogProps) {
  // programId is available for future use when linking programs to teams
  void _programId;
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(currentTeamId || null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load teams
  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  // Load team members when team changes
  useEffect(() => {
    if (selectedTeamId) {
      loadTeamMembers(selectedTeamId);
    } else {
      setTeamMembers([]);
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    setIsLoading(true);
    const data = await getTeams();
    setTeams(data);
    setIsLoading(false);
  };

  const loadTeamMembers = async (teamId: string) => {
    setIsLoading(true);
    const members = await getTeamMembers(teamId);
    setTeamMembers(members);
    setIsLoading(false);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setIsLoading(true);
    const team = await createTeam(newTeamName.trim());
    if (team) {
      setTeams([...teams, team]);
      setSelectedTeamId(team.id);
      setShowCreateTeam(false);
      setNewTeamName('');
      setSuccess('Team created successfully!');
    } else {
      setError('Failed to create team');
    }
    setIsLoading(false);
  };

  const handleInvite = async () => {
    if (!selectedTeamId || !inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    const result = await inviteToTeam(selectedTeamId, inviteEmail.trim(), inviteRole);
    if (result) {
      await loadTeamMembers(selectedTeamId);
      setInviteEmail('');
      setSuccess('Invitation sent!');
    } else {
      setError('Failed to invite user. Make sure the email is registered.');
    }
    setIsLoading(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeamId) return;

    setIsLoading(true);
    const result = await removeFromTeam(selectedTeamId, userId);
    if (result) {
      await loadTeamMembers(selectedTeamId);
      setSuccess('Member removed');
    } else {
      setError('Failed to remove member');
    }
    setIsLoading(false);
  };

  const handleRoleChange = async (userId: string, role: 'editor' | 'viewer') => {
    if (!selectedTeamId) return;

    setIsLoading(true);
    const result = await updateMemberRole(selectedTeamId, userId, role);
    if (result) {
      await loadTeamMembers(selectedTeamId);
    } else {
      setError('Failed to update role');
    }
    setIsLoading(false);
  };

  const handleSave = useCallback(() => {
    if (onTeamChange) {
      onTeamChange(selectedTeamId);
    }
    onClose();
  }, [selectedTeamId, onTeamChange, onClose]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 id="share-dialog-title" className="text-lg font-semibold">
            Share "{programName}"
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Share this program with your team members
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex justify-between">
              {error}
              <button onClick={clearMessages} className="text-red-500">&times;</button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex justify-between">
              {success}
              <button onClick={clearMessages} className="text-green-500">&times;</button>
            </div>
          )}

          {/* Team selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value || null)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Personal (not shared)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCreateTeam(!showCreateTeam)}
                className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                + New Team
              </button>
            </div>
          </div>

          {/* Create new team */}
          {showCreateTeam && (
            <div className="p-3 bg-blue-50 rounded-lg space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Team Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="My Awesome Team"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleCreateTeam}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Team members */}
          {selectedTeamId && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Team Members ({teamMembers.length})
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {teamMembers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 text-center">
                      No members yet. Invite someone below!
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {teamMembers.map((member) => (
                        <li
                          key={member.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {member.email || member.userId}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {member.role}
                            </div>
                          </div>
                          {member.role !== 'owner' && (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    member.userId,
                                    e.target.value as 'editor' | 'viewer'
                                  )
                                }
                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Invite member */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Invite Member
                </h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as 'editor' | 'viewer')
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={isLoading || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sharing explanation */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">Sharing Permissions:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Editor:</strong> Can view and edit the program</li>
              <li><strong>Viewer:</strong> Can only view the program</li>
              <li>Only one person can edit at a time (editing lock)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
