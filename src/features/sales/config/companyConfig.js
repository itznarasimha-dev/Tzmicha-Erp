/**
 * Canonical Organization & Company Profile Configuration.
 * Used for invoice, quotation, and receipt document styling, banking details, and headers.
 */
export const DEFAULT_COMPANY_CONFIG = {
  name: 'ApexERP Industrial Solutions Pvt. Ltd.',
  brandName: 'ApexERP',
  tagline: 'Precision Manufacturing & Wholesale Distribution',
  logoUrl: '/favicon.svg',
  registeredAddress: 'Plot 42, Sector 18, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026, India',
  phone: '+91 20 6712 4000',
  mobile: '+91 98200 45678',
  email: 'sales@apexflow-erp.com',
  officialEmail: 'info@apexflow-erp.com',
  website: 'https://www.apexflow-erp.com',
  gstin: '27AAACA9012K1Z4',
  pan: 'AAACA9012K',
  cin: 'U29299PN2018PTC174820',
  iec: '0318029145',

  // Company Bank Details for document headers and customer payment instructions
  bankDetails: {
    accountHolderName: 'ApexERP Industrial Solutions Pvt. Ltd.',
    bankName: 'HDFC Bank Ltd.',
    branch: 'Bhosari Industrial Area Branch, Pune',
    accountNumber: '502000889921',
    ifscCode: 'HDFC0001244',
    micrCode: '411240018',
    swiftCode: 'HDFCINBBXXX',
    upiId: 'apexerpsolutions@hdfcbank',
    qrCodeUrl: '/qr-placeholder.png',
  },

  termsAndConditions: [
    'Goods once sold cannot be returned unless found defective upon delivery.',
    'Interest @ 18% per annum will be charged on overdue payments after due date.',
    'All disputes are subject to Pune, Maharashtra jurisdiction only.',
    'Warranty is applicable as per OEM manufacturer standard coverage guidelines.',
  ],
};
