// Loads Razorpay's checkout script on demand and opens the payment window.
// Needs https://checkout.razorpay.com allowed by your site's Content-Security-Policy when you deploy.
let loading;
const loadScript = () => {
  if (window.Razorpay) return Promise.resolve();
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve; s.onerror = () => { loading = null; reject(new Error('Could not load the payment window. Check your internet connection.')); };
    document.head.appendChild(s);
  });
  return loading;
};

// Resolves { status: 'paid', response } or { status: 'dismissed' }. The caller must verify 'paid' on the server.
export async function openRazorpay(rz, prefill = {}, description = 'Marketplace order') {
  await loadScript();
  return new Promise((resolve) => {
    new window.Razorpay({
      key: rz.keyId, amount: rz.amount, currency: rz.currency, order_id: rz.orderId, name: 'KrishiMitra AI', description,
      prefill: { name: prefill.name, contact: prefill.contact }, theme: { color: '#1f5e3b' },
      handler: (response) => resolve({ status: 'paid', response }),
      modal: { ondismiss: () => resolve({ status: 'dismissed' }) },
    }).open();
  });
}
