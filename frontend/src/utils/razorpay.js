export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
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

export const openRazorpayCheckout = async ({
  orderId,
  amount,
  keyId,
  user,
  onSuccess,
  onFailure,
  onDismiss,
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    if (onFailure) onFailure(new Error('Failed to load Razorpay SDK. Please check your internet connection.'));
    return;
  }

  const options = {
    key: keyId || 'rzp_test_SwH8iFgdigaXv4',
    amount: amount, // in paise
    currency: 'INR',
    name: 'Velocity',
    description: 'Add Cash to Wallet',
    order_id: orderId,
    prefill: {
      name: user?.name || 'Devon Miller',
      email: user?.email || 'devon@velocity.io',
      contact: user?.phone || '9999999999',
    },
    theme: {
      color: '#6366f1',
    },
    handler: function (response) {
      if (onSuccess) {
        onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      if (onFailure) onFailure(response.error);
    });
    rzp.open();
  } catch (err) {
    if (onFailure) onFailure(err);
  }
};
