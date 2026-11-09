declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOrderData {
  orderId: string;
  keyId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  invoiceNumber: string;
  invoiceId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
}

export interface RazorpayPaymentSuccessResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const launchRazorpayCheckout = async (
  orderData: RazorpayOrderData,
  onSuccess: (payment: RazorpayPaymentSuccessResult) => void,
  onError: (err: any) => void,
  onDismiss?: () => void
) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    onError(new Error('Razorpay payment gateway failed to load. Please check your internet connection.'));
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.amountInPaise,
    currency: orderData.currency || 'INR',
    name: orderData.companyName || 'TechCare Service Solutions',
    description: `Settlement for Invoice #${orderData.invoiceNumber}`,
    image: 'https://cdn-icons-png.flaticon.com/512/3050/3050525.png',
    order_id: orderData.orderId,
    prefill: {
      name: orderData.customerName || '',
      email: orderData.customerEmail || '',
      contact: orderData.customerPhone || '',
    },
    notes: {
      invoice_number: orderData.invoiceNumber,
      invoice_id: String(orderData.invoiceId),
    },
    theme: {
      color: '#0071e3', // TechCare brand primary
    },
    handler: (response: RazorpayPaymentSuccessResult) => {
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (response: any) => {
    onError(response.error);
  });
  rzp.open();
};

