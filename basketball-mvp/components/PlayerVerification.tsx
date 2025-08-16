'use client'

import { useState } from 'react'
import { Player } from '@/lib/supabase'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface PlayerVerificationProps {
  players: Player[]
  onVerify: (playerId: string, verified: boolean) => void
  canVerify: boolean
}

export default function PlayerVerification({ players, onVerify, canVerify }: PlayerVerificationProps) {
  const [verifying, setVerifying] = useState<string | null>(null)

  const handleVerify = async (playerId: string, verified: boolean) => {
    if (!canVerify) return
    
    setVerifying(playerId)
    await onVerify(playerId, verified)
    setVerifying(null)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Player Verification</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-text-secondary">#{player.jersey_number}</span>
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-sm text-text-secondary">{player.position} • Age {player.age}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {player.verified ? (
                <span className="badge-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              ) : canVerify ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleVerify(player.id, true)}
                    disabled={verifying === player.id}
                    className="p-1 text-success hover:bg-success/20 rounded transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleVerify(player.id, false)}
                    disabled={verifying === player.id}
                    className="p-1 text-live hover:bg-live/20 rounded transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <span className="badge-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}