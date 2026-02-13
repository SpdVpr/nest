import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/admin/settings - Get admin settings
export async function GET(request: NextRequest) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (token !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const db = getFirebaseAdminDb()
        const doc = await db.collection('admin_settings').doc('general').get()

        if (!doc.exists) {
            return NextResponse.json({
                settings: {
                    bank_account: '',
                    bank_iban: '',
                    account_holder: '',
                }
            })
        }

        return NextResponse.json({ settings: doc.data() })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

// POST /api/admin/settings - Update admin settings
export async function POST(request: NextRequest) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (token !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { bank_account, account_holder } = body

        const db = getFirebaseAdminDb()

        // Auto-generate IBAN from Czech account number
        let iban = ''
        if (bank_account && bank_account.includes('/')) {
            iban = czechAccountToIBAN(bank_account)
        }

        await db.collection('admin_settings').doc('general').set({
            bank_account: bank_account || '',
            bank_iban: iban,
            account_holder: account_holder || '',
            updated_at: new Date().toISOString(),
        }, { merge: true })

        return NextResponse.json({ success: true, iban })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}

// Convert Czech bank account number (e.g. "19-2000145399/0800") to IBAN
function czechAccountToIBAN(account: string): string {
    try {
        // Trim whitespace
        const trimmed = account.trim()
        const [accountPart, bankCode] = trimmed.split('/')
        if (!bankCode) return ''

        let prefix = '0'
        let number = accountPart

        if (accountPart.includes('-')) {
            [prefix, number] = accountPart.split('-')
        }

        const paddedBankCode = bankCode.padStart(4, '0')
        const paddedPrefix = prefix.padStart(6, '0')
        const paddedNumber = number.padStart(10, '0')

        // BBAN = bank code + prefix + account number
        const bban = paddedBankCode + paddedPrefix + paddedNumber

        // ISO 13616 IBAN check digit calculation:
        // 1. Move country code (CZ = "1235") and check placeholder "00" to the end
        // 2. Calculate mod 97 using BigInt for precision
        // 3. Check digits = 98 - remainder
        const numericString = bban + '123500'  // CZ=1235, placeholder 00

        // Use digit-by-digit modulo for large number precision
        let remainder = 0
        for (const char of numericString) {
            remainder = (remainder * 10 + parseInt(char)) % 97
        }
        const checkDigits = (98 - remainder).toString().padStart(2, '0')

        return `CZ${checkDigits}${bban}`
    } catch {
        return ''
    }
}
