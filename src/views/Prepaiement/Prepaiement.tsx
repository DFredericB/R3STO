import { useState, useEffect } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/useAppStore'

interface BillItem {
  name: string
  quantity: number
  price: number
}

interface SplitConfig {
  mode: 'none' | 'equal' | 'custom'
  parts: number
  customAmounts?: number[]
}

type PaymentState = 'viewing' | 'splitting' | 'paying' | 'processing' | 'success'
type PaymentMethod = 'twint' | 'card' | 'apple' | 'google'
type TipPercentage = 0 | 5 | 10 | 15

const DEMO_BILL_ITEMS: BillItem[] = [
  { name: 'Salade César', quantity: 2, price: 16 },
  { name: 'Entrecôte 250g', quantity: 1, price: 46 },
  { name: 'Filet de perche', quantity: 1, price: 38 },
  { name: 'Tiramisu', quantity: 2, price: 14 },
  { name: 'Eau minérale', quantity: 2, price: 5 },
  { name: 'Vin rouge (Humagne)', quantity: 1, price: 48 },
]

export function Prepaiement() {
  const { toast } = useToast()
  const { isDemo } = useAppStore()
  const billItems: BillItem[] = isDemo ? DEMO_BILL_ITEMS : []
  const [state, setState] = useState<PaymentState>('viewing')
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('twint')
  const [selectedTip, setSelectedTip] = useState<TipPercentage>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [emailReceipt, setEmailReceipt] = useState(true)
  const [email, setEmail] = useState('')
  const [split, setSplit] = useState<SplitConfig>({ mode: 'none', parts: 1 })
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' })
  const [processingProgress, setProcessingProgress] = useState(0)

  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tipAmount = customTip ? parseFloat(customTip) : (subtotal * selectedTip) / 100
  const total = subtotal + tipAmount
  const amountPerPerson = split.mode === 'none' ? total : total / split.parts

  useEffect(() => {
    if (state === 'processing') {
      const interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setState('success'), 500)
            return 100
          }
          return prev + Math.random() * 40
        })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [state])

  const handlePayment = () => {
    if (selectedPayment === 'card') {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc) {
        toast('Veuillez remplir tous les champs de la carte', 'error')
        return
      }
    }
    setState('processing')
  }

  const handleNewPayment = () => {
    setState('viewing')
    setSelectedTip(0)
    setCustomTip('')
    setSplit({ mode: 'none', parts: 1 })
    setCardDetails({ number: '', expiry: '', cvc: '' })
    setProcessingProgress(0)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--hh))',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      {state !== 'success' && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surf)',
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--text)',
            margin: 0,
            marginBottom: 4,
          }}>
            Table T3
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--t2)',
            margin: 0,
          }}>
            {state === 'viewing' && 'Consultez votre facture'}
            {state === 'splitting' && 'Partager la facture'}
            {state === 'paying' && 'Méthode de paiement'}
          </p>
        </div>
      )}

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {state === 'viewing' && (
          <>
            {/* Bill Items */}
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 12,
              }}>
                Commandes
              </div>
              {billItems.length === 0 && (
                <div style={{
                  padding: '32px 20px',
                  background: 'var(--surf)',
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                  textAlign: 'center',
                  color: 'var(--t3)',
                  fontSize: 13,
                }}>
                  Aucune commande en cours. Les tickets apparaîtront ici dès que la caisse sera branchée.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {billItems.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--surf)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text)',
                      }}>
                        {item.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--t3)',
                        marginTop: 2,
                      }}>
                        x{item.quantity} à CHF {item.price.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text)',
                      fontFamily: "'DM Mono, monospace'",
                    }}>
                      CHF {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div style={{
              padding: '16px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>Sous-total</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--text)',
                }}>
                  CHF {subtotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>Pourboire</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'DM Mono, monospace'",
                  color: tipAmount > 0 ? 'var(--gn)' : 'var(--t3)',
                }}>
                  CHF {tipAmount.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>Total</span>
                <span style={{
                  fontSize: 20,
                  fontWeight: 900,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--bl)',
                }}>
                  CHF {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tip Selection */}
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 12,
              }}>
                Pourboire
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}>
                {[
                  { label: 'Aucun', value: 0 },
                  { label: '5%', value: 5 },
                  { label: '10%', value: 10 },
                  { label: '15%', value: 15 },
                  { label: 'Perso', value: null },
                ].map((tip) => (
                  <button
                    key={tip.value === null ? 'custom' : tip.value}
                    onClick={() => {
                      if (tip.value !== null) {
                        setSelectedTip(tip.value as TipPercentage)
                        setCustomTip('')
                      }
                    }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 8,
                      border: `2px solid ${(selectedTip === tip.value && !customTip) || (tip.value === null && customTip) ? 'var(--gn)' : 'var(--border)'}`,
                      background: (selectedTip === tip.value && !customTip) || (tip.value === null && customTip) ? 'var(--gn)15' : 'var(--surf)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tip.label}
                  </button>
                ))}
              </div>
              {selectedTip === 15 || customTip ? (
                <input
                  type="number"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="CHF"
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surf)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'DM Mono, monospace'",
                  }}
                />
              ) : null}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <button
                onClick={() => setState('splitting')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Partager
              </button>
              <button
                onClick={() => setState('paying')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--bl)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Payer
              </button>
            </div>
          </>
        )}

        {state === 'splitting' && (
          <>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 12,
              }}>
                Mode de partage
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                {[
                  { label: 'Sans partage', value: 'none' as const },
                  { label: 'En 2 parts égales', value: 'equal', parts: 2 },
                  { label: 'En 3 parts égales', value: 'equal', parts: 3 },
                  { label: 'En 4 parts égales', value: 'equal', parts: 4 },
                  { label: 'Montants personnalisés', value: 'custom' as const },
                ].map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (option.value === 'none') {
                        setSplit({ mode: 'none', parts: 1 })
                      } else if (option.value === 'equal') {
                        setSplit({ mode: 'equal', parts: option.parts! })
                      } else {
                        setSplit({ mode: 'custom', parts: 2 })
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 8,
                      border: `2px solid ${split.mode === option.value && (option.value === 'none' || option.value === 'custom' || split.parts === option.parts) ? 'var(--bl)' : 'var(--border)'}`,
                      background: split.mode === option.value && (option.value === 'none' || option.value === 'custom' || split.parts === option.parts) ? 'var(--bp)' : 'var(--surf)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{option.label}</div>
                    {option.value === 'equal' && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                        CHF {(total / option.parts!).toFixed(2)} par personne
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {split.mode === 'custom' && (
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: 12,
                }}>
                  Montants
                </div>
                <div style={{
                  padding: '16px',
                  background: 'var(--surf)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Nombre de parts</label>
                    <select
                      value={split.parts}
                      onChange={(e) => setSplit({ ...split, parts: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: 'var(--surf2)',
                        color: 'var(--text)',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} parts</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div style={{
              padding: '16px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>Par personne</span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 900,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--bl)',
                }}>
                  CHF {amountPerPerson.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Total à payer</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--text)',
                }}>
                  CHF {total.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <button
                onClick={() => setState('viewing')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retour
              </button>
              <button
                onClick={() => setState('paying')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--bl)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {state === 'paying' && (
          <>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 12,
              }}>
                Méthode de paiement
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}>
                {[
                  { id: 'twint' as const, label: 'TWINT', icon: '📱' },
                  { id: 'card' as const, label: 'Carte', icon: '💳' },
                  { id: 'apple' as const, label: 'Apple Pay', icon: '🍎' },
                  { id: 'google' as const, label: 'Google Pay', icon: '🔵' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 8,
                      border: `2px solid ${selectedPayment === method.id ? 'var(--bl)' : 'var(--border)'}`,
                      background: selectedPayment === method.id ? 'var(--bp)' : 'var(--surf)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{method.icon}</span>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedPayment === 'card' && (
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: 12,
                }}>
                  Détails de la carte
                </div>
                <div style={{
                  padding: '16px',
                  background: 'var(--surf)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <input
                    type="text"
                    placeholder="Numéro de carte"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() })}
                    maxLength={19}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surf2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'DM Mono, monospace'",
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      maxLength={5}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surf2)',
                        color: 'var(--text)',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "'DM Mono, monospace'",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      value={cardDetails.cvc}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                      maxLength={4}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surf2)',
                        color: 'var(--text)',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "'DM Mono, monospace'",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  id="email-receipt"
                  checked={emailReceipt}
                  onChange={(e) => setEmailReceipt(e.target.checked)}
                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                />
                <label htmlFor="email-receipt" style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}>
                  Reçu par email
                </label>
              </div>
              {emailReceipt && (
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surf)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
              )}
            </div>

            <div style={{
              padding: '16px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>Sous-total</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--text)',
                }}>
                  CHF {subtotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>Pourboire</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--text)',
                }}>
                  CHF {tipAmount.toFixed(2)}
                </span>
              </div>
              {split.mode !== 'none' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>Votre part</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'DM Mono, monospace'",
                    color: 'var(--text)',
                  }}>
                    CHF {amountPerPerson.toFixed(2)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>À payer</span>
                <span style={{
                  fontSize: 18,
                  fontWeight: 900,
                  fontFamily: "'DM Mono, monospace'",
                  color: 'var(--bl)',
                }}>
                  CHF {(split.mode === 'none' ? total : amountPerPerson).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <button
                onClick={() => setState('viewing')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handlePayment}
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--gn)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Payer CHF {(split.mode === 'none' ? total : amountPerPerson).toFixed(2)}
              </button>
            </div>
          </>
        )}

        {state === 'processing' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 24,
          }}>
            <div style={{
              fontSize: 64,
              animation: 'spin 2s linear infinite',
            }}>
              💳
            </div>
            <div>
              <h2 style={{
                fontSize: 20,
                fontWeight: 900,
                color: 'var(--text)',
                margin: '0 0 12px 0',
                textAlign: 'center',
              }}>
                Paiement en cours
              </h2>
              <p style={{
                fontSize: 13,
                color: 'var(--t2)',
                margin: 0,
                textAlign: 'center',
              }}>
                Veuillez patienter...
              </p>
            </div>
            <div style={{
              width: '100%',
              maxWidth: 300,
              height: 6,
              background: 'var(--surf)',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                height: '100%',
                background: 'var(--bl)',
                width: `${processingProgress}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {state === 'success' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 24,
            padding: '24px',
          }}>
            <style>{`
              @keyframes checkmark-bounce {
                0%, 100% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
              }
              .checkmark {
                animation: checkmark-bounce 0.6s ease-out;
              }
            `}</style>
            <div style={{
              fontSize: 80,
            }}>
              ✓
            </div>
            <div>
              <h2 style={{
                fontSize: 24,
                fontWeight: 900,
                color: 'var(--gn)',
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}>
                Paiement confirmé
              </h2>
              <p style={{
                fontSize: 13,
                color: 'var(--t2)',
                margin: 0,
                textAlign: 'center',
              }}>
                CHF {(split.mode === 'none' ? total : amountPerPerson).toFixed(2)}
              </p>
            </div>

            <div style={{
              width: '100%',
              padding: '16px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              {emailReceipt && email ? (
                <>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--t3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    marginBottom: 8,
                  }}>
                    Reçu envoyé
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}>
                    {email}
                  </div>
                </>
              ) : (
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}>
                  Merci de votre visite
                </div>
              )}
            </div>

            <button
              onClick={handleNewPayment}
              style={{
                padding: '14px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--bl)',
                color: 'white',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              Nouveau paiement
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
