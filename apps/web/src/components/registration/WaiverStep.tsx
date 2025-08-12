'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Pen,
  Shield,
  Calendar,
  User
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WaiverStepProps {
  participantName: string
  participantType: 'player' | 'coach' | 'volunteer'
  isMinor?: boolean
  parentName?: string
  onSign: (signature: string) => void
  signed?: boolean
}

export function WaiverStep({
  participantName,
  participantType,
  isMinor = false,
  parentName,
  onSign,
  signed = false
}: WaiverStepProps) {
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')
  const [signatureDate] = useState(new Date().toLocaleDateString())
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('type')

  // Canvas drawing logic
  useEffect(() => {
    if (signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
      }
    }
  }, [signatureType])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (signatureType !== 'draw' || signed) return
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureType !== 'draw' || signed) return
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSign = () => {
    if (!agreed) return
    
    if (signatureType === 'type' && signature.trim()) {
      onSign(signature)
    } else if (signatureType === 'draw' && hasDrawn && canvasRef.current) {
      // Convert canvas to base64 string
      const signatureData = canvasRef.current.toDataURL()
      onSign(signatureData)
    }
  }

  const signerName = isMinor && parentName ? parentName : participantName
  const signerRole = isMinor ? 'Parent/Guardian' : participantType.charAt(0).toUpperCase() + participantType.slice(1)

  const waiverContent = `
PARTICIPANT WAIVER AND RELEASE OF LIABILITY

I, ${signerName}, ${isMinor ? `as parent/guardian of ${participantName},` : ''} acknowledge that participation in basketball activities involves certain inherent risks, including but not limited to:

• Risk of injury from basketball activities
• Risk of injury from other participants
• Risk of injury from equipment or facilities
• Risk of contracting communicable diseases

ASSUMPTION OF RISK: I understand and acknowledge these risks and voluntarily assume all risks associated with participation in GameTriq basketball activities.

RELEASE OF LIABILITY: I hereby release, waive, discharge, and covenant not to sue GameTriq, its officers, employees, agents, and volunteers from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or related to any loss, damage, or injury that may be sustained by ${isMinor ? participantName : 'me'}.

MEDICAL AUTHORIZATION: I authorize GameTriq staff to seek emergency medical treatment for ${isMinor ? participantName : 'me'} if necessary. I agree to be financially responsible for any medical treatment required.

PHOTOGRAPHY RELEASE: I grant GameTriq permission to use photographs or video of ${isMinor ? participantName : 'me'} for promotional purposes.

COVID-19 ACKNOWLEDGMENT: I acknowledge the contagious nature of COVID-19 and voluntarily assume the risk of exposure or infection by participating in GameTriq activities.

${isMinor ? `PARENTAL CONSENT: As the parent/guardian of ${participantName}, I have the legal authority to sign this waiver on their behalf. I have explained the risks to my child and they understand and agree to follow all safety rules.` : ''}

By signing below, I acknowledge that I have read, understood, and agree to all terms of this waiver.
  `.trim()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Waiver and Release of Liability</span>
          </CardTitle>
          <CardDescription>
            Please review and sign the participant waiver
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {signed ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Waiver Signed Successfully</h3>
              <p className="text-muted-foreground mb-4">
                The waiver has been signed and recorded
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary">
                  <User className="h-3 w-3 mr-1" />
                  Signed by: {signerName}
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  Date: {signatureDate}
                </Badge>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Participant Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Participant Information</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Name:</strong> {participantName}</p>
                  <p><strong>Type:</strong> {participantType.charAt(0).toUpperCase() + participantType.slice(1)}</p>
                  {isMinor && (
                    <>
                      <p><strong>Status:</strong> Minor (Under 18)</p>
                      <p><strong>Parent/Guardian:</strong> {parentName}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Waiver Text */}
              <div>
                <Label className="text-base font-medium mb-2 block">Waiver Agreement</Label>
                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{waiverContent}</pre>
                </ScrollArea>
              </div>

              {/* Download Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // In a real app, this would download a PDF
                  const blob = new Blob([waiverContent], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `waiver-${participantName.replace(/\s+/g, '-').toLowerCase()}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Waiver Copy
              </Button>

              {/* Agreement Checkbox */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree-waiver"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor="agree-waiver" 
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    I have read, understood, and agree to the terms of this waiver
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you acknowledge that you are signing this waiver voluntarily
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              {agreed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 border-t pt-4"
                >
                  <div>
                    <Label className="text-base font-medium mb-2 block">Digital Signature</Label>
                    
                    {/* Signature Type Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={signatureType === 'type' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('type')}
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Type Signature
                      </Button>
                      <Button
                        type="button"
                        variant={signatureType === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('draw')}
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Draw Signature
                      </Button>
                    </div>

                    {signatureType === 'type' ? (
                      <div className="space-y-2">
                        <Label htmlFor="typed-signature">
                          Type your full legal name to sign
                        </Label>
                        <Input
                          id="typed-signature"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder={signerName}
                          className="font-serif text-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          {isMinor ? 'Parent/Guardian signature required' : 'Your typed name serves as your digital signature'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Draw your signature below</Label>
                        <div className="relative">
                          <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            className={cn(
                              "border rounded-md w-full cursor-crosshair bg-white",
                              "touch-none" // Prevent scrolling on touch devices
                            )}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={(e) => {
                              const touch = e.touches[0]
                              const mouseEvent = new MouseEvent('mousedown', {
                                clientX: touch.clientX,
                                clientY: touch.clientY
                              })
                              canvasRef.current?.dispatchEvent(mouseEvent)
                            }}
                            onTouchMove={(e) => {
                              const touch = e.touches[0]
                              const mouseEvent = new MouseEvent('mousemove', {
                                clientX: touch.clientX,
                                clientY: touch.clientY
                              })
                              canvasRef.current?.dispatchEvent(mouseEvent)
                            }}
                            onTouchEnd={() => {
                              const mouseEvent = new MouseEvent('mouseup', {})
                              canvasRef.current?.dispatchEvent(mouseEvent)
                            }}
                          />
                          {hasDrawn && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={clearCanvas}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use your mouse or finger to draw your signature
                        </p>
                      </div>
                    )}

                    {/* Signer Info */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-sm">Signer Name</Label>
                        <p className="text-sm font-medium">{signerName}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Date</Label>
                        <p className="text-sm font-medium">{signatureDate}</p>
                      </div>
                    </div>

                    {isMinor && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                        <div className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm text-amber-800">
                            <p className="font-medium">Parental Consent</p>
                            <p className="text-xs mt-1">
                              By signing, you confirm you are the parent/guardian and have legal authority to consent on behalf of {participantName}.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sign Button */}
                    <Button
                      onClick={handleSign}
                      className="w-full mt-4"
                      disabled={
                        (signatureType === 'type' && !signature.trim()) ||
                        (signatureType === 'draw' && !hasDrawn)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Sign Waiver
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Legal Notice</p>
            <p className="mt-1">
              This digital signature is legally binding and has the same validity as a handwritten signature. 
              A copy of this signed waiver will be emailed to you for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}