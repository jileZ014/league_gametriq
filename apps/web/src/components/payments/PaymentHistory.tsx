'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  Download, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Receipt,
  RotateCcw
} from 'lucide-react'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/stripe/stripe-client'
import { paymentAPI } from '@/lib/stripe/payment-api'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Payment {
  id: string
  orderId: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded'
  description?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

interface PaymentHistoryProps {
  userId?: string
  showActions?: boolean
  pageSize?: number
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    variant: 'secondary' as const,
    color: 'text-yellow-600' 
  },
  processing: { 
    label: 'Processing', 
    icon: RefreshCw, 
    variant: 'secondary' as const,
    color: 'text-blue-600' 
  },
  succeeded: { 
    label: 'Paid', 
    icon: CheckCircle2, 
    variant: 'default' as const,
    color: 'text-green-600' 
  },
  failed: { 
    label: 'Failed', 
    icon: XCircle, 
    variant: 'destructive' as const,
    color: 'text-red-600' 
  },
  canceled: { 
    label: 'Canceled', 
    icon: XCircle, 
    variant: 'outline' as const,
    color: 'text-gray-600' 
  },
  refunded: { 
    label: 'Refunded', 
    icon: RotateCcw, 
    variant: 'outline' as const,
    color: 'text-purple-600' 
  },
}

export function PaymentHistory({ userId, showActions = true, pageSize = 10 }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadPayments()
  }, [currentPage, statusFilter])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await paymentAPI.getPaymentHistory({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      })

      let filteredPayments = response.payments
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredPayments = filteredPayments.filter(p => p.status === statusFilter)
      }

      // Apply search filter
      if (searchTerm) {
        filteredPayments = filteredPayments.filter(p => 
          p.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }

      setPayments(filteredPayments)
      setTotal(response.total)
      setTotalPages(Math.ceil(response.total / pageSize))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment history'
      setError(message)
      toast.error('Failed to load payments', { description: message })
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (payment: Payment) => {
    if (!confirm('Are you sure you want to request a refund for this payment?')) {
      return
    }

    try {
      await paymentAPI.processRefund({
        orderId: payment.orderId,
        reason: 'Customer requested refund',
      })

      toast.success('Refund request submitted successfully')
      loadPayments() // Reload to show updated status
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process refund'
      toast.error('Refund failed', { description: message })
    }
  }

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      // This would typically generate and download a PDF receipt
      toast.info('Receipt download would be implemented here')
    } catch (err) {
      toast.error('Failed to download receipt')
    }
  }

  const filteredAndSearchedPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.description && payment.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading && payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading payment history...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment History</span>
            </CardTitle>
            <CardDescription>
              View and manage your payment transactions
            </CardDescription>
          </div>
          <Button onClick={loadPayments} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Payments Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSearchedPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No payments found matching your criteria'
                        : 'No payments found'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSearchedPayments.map((payment) => {
                  const config = statusConfig[payment.status]
                  const StatusIcon = config.icon

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {payment.orderId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {payment.description || payment.metadata?.description || 'Payment'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(payment.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="flex items-center w-fit">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownloadReceipt(payment)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Download Receipt
                              </DropdownMenuItem>
                              {payment.status === 'succeeded' && (
                                <DropdownMenuItem 
                                  onClick={() => handleRefund(payment)}
                                  className="text-red-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Request Refund
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, total)} to{' '}
              {Math.min(currentPage * pageSize, total)} of {total} payments
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PaymentHistory