/* ============================================
   ReviveAI — AI Service (Mock)
   Simulates AI responses for chat and dunning
   ============================================ */

const AIService = (() => {
  // Simulated AI responses for revenue queries
  const responses = {
    'revenue': {
      text: `Based on my analysis of your revenue data:\n\n📊 **Total MRR**: ${Formatters ? Formatters.currency(MockData.stats.mrr) : '$127,400'}\n📈 **Month-over-month growth**: +4.2%\n💰 **Recovered this month**: ${Formatters ? Formatters.currency(MockData.stats.recoveredRevenue) : '$32,500'}\n⚠️ **At-risk revenue**: ${Formatters ? Formatters.currency(MockData.stats.atRiskRevenue) : '$41,200'}\n\nYour recovery rate of ${MockData.stats.recoveryRate}% is above industry average (58%). The AI dunning system has been particularly effective with Day 3 follow-ups, showing a 34% higher recovery rate than generic reminders.\n\n**Recommendation**: Focus on the 12 critical-risk customers representing $18,400 in MRR. Scheduling personal outreach could prevent 60-70% of potential churn.`,
      chart: null
    },
    'churn': {
      text: `🔮 **Churn Prediction Analysis**:\n\nI've identified **${MockData.customers.filter(c => c.riskScore >= 60).length} high-risk customers** that are likely to churn within the next 30 days.\n\n**Key churn indicators detected:**\n• 📉 Usage decline > 40% in 8 accounts\n• 🎫 Support ticket surge in 5 accounts\n• 💳 Payment failures in 6 accounts\n• 😟 Negative NPS scores from 4 accounts\n\n**Total at-risk MRR**: ${Formatters ? Formatters.currency(MockData.stats.atRiskRevenue) : '$41,200'}\n\n**AI Recommendation**: Deploy the "Win-Back" campaign targeting the top 5 critical accounts first. Historical data shows this approach recovers 42% of at-risk revenue when initiated within the first 7 days of risk detection.`,
      chart: null
    },
    'payments': {
      text: `💳 **Payment Recovery Summary**:\n\n**This Month's Failed Payments**: ${MockData.failedPayments.length} transactions\n**Successfully Recovered**: ${MockData.failedPayments.filter(p => p.status === 'recovered').length} (${Formatters ? Formatters.currency(MockData.failedPayments.filter(p => p.recovered).reduce((s, p) => s + p.recoveredAmount, 0)) : '$12,300'})\n**Pending Retry**: ${MockData.failedPayments.filter(p => p.status === 'pending_retry').length}\n**Permanently Failed**: ${MockData.failedPayments.filter(p => p.status === 'failed').length}\n\n**Top Failure Reasons:**\n1. Card expired — 35% of failures\n2. Insufficient funds — 28%\n3. Bank declined — 18%\n4. Network errors — 12%\n\n**Smart Insight**: Retries scheduled between 6-9 AM local time have a 23% higher success rate. I've adjusted 4 upcoming retries to this window.`,
      chart: null
    },
    'pricing': {
      text: `💰 **Pricing Optimization Analysis**:\n\nCurrent average price: **$79/mo**\nAI-recommended optimal price: **$89/mo**\n\n**Why $89?**\nBased on price elasticity analysis (elasticity coefficient: -1.4), a $10 increase would:\n• Reduce conversion by ~8%\n• But increase ARPU by 12.7%\n• **Net revenue impact: +$14,200/mo** 📈\n\n**Competitor Benchmark:**\n• You're 15% below market average\n• Your feature set justifies premium pricing\n• 78% of churned users cited reasons OTHER than price\n\n**Recommendation**: Implement gradual price increase for new customers while grandfathering existing ones. This "Anchor Pricing" strategy has shown 3x lower churn than immediate price changes.`,
      chart: null
    },
    'default': {
      text: `Great question! Let me analyze your revenue data...\n\nHere's what I found:\n\n📊 Your overall revenue health score is **${Math.floor(Math.random() * 20 + 70)}/100**\n\n**Key Highlights:**\n• Recovery rate is trending upward (+3.2% this quarter)\n• Smart dunning emails have a 67% open rate\n• Payment retry optimization saved $8,400 last month\n• 3 customers show early warning signs of churn\n\nWould you like me to dive deeper into any of these areas? You can ask about:\n• "Show me churn predictions"\n• "Analyze failed payments"\n• "What's our revenue trend?"\n• "Optimize our pricing"`,
      chart: null
    }
  };

  // Match user query to a response
  function getResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('revenue') || q.includes('mrr') || q.includes('money') || q.includes('earn') || q.includes('income')) {
      return responses.revenue;
    }
    if (q.includes('churn') || q.includes('risk') || q.includes('leave') || q.includes('cancel') || q.includes('lose')) {
      return responses.churn;
    }
    if (q.includes('payment') || q.includes('fail') || q.includes('decline') || q.includes('retry') || q.includes('recover')) {
      return responses.payments;
    }
    if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('charge') || q.includes('plan')) {
      return responses.pricing;
    }
    return responses.default;
  }

  // Simulate streaming AI response
  async function streamResponse(query, onChunk, onComplete) {
    const response = getResponse(query);
    const text = response.text;
    const words = text.split(' ');
    let current = '';

    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i];
      onChunk(current);
      // Variable delay to simulate thinking
      await new Promise(r => setTimeout(r, 15 + Math.random() * 35));
    }

    if (onComplete) onComplete(response);
  }

  // Generate dunning email
  function generateDunningEmail(customer, tone, step) {
    const emails = {
      'Friendly': {
        subject: `Quick heads up about your payment, ${customer.name.split(' ')[0]}`,
        body: `Hi ${customer.name.split(' ')[0]},\n\nJust a friendly note — it looks like your recent payment of ${Formatters.currency(customer.mrr)} didn't go through. This happens sometimes, and it's usually an easy fix!\n\nHere are a few things you can try:\n• Update your payment method in your account settings\n• Make sure your card hasn't expired\n• Contact your bank if the issue persists\n\nYour ${customer.plan} plan access won't be affected right away — we've got you covered for the next few days.\n\nNeed help? Just reply to this email and I'll personally assist you.\n\nCheers,\nThe ReviveAI Team 💜`
      },
      'Helpful': {
        subject: `Let's get your ${customer.plan} plan payment sorted`,
        body: `Hey ${customer.name.split(' ')[0]},\n\nWe noticed your payment of ${Formatters.currency(customer.mrr)} for your ${customer.plan} plan hasn't been processed yet. We don't want you to miss out on any features!\n\n🔧 **Quick Fix Options:**\n1. Update your card: Go to Settings → Billing → Update Payment Method\n2. Try a different card: We accept Visa, Mastercard, and Amex\n3. Switch to annual billing: Save 20% and avoid monthly payment issues\n\nWe've automatically scheduled a retry for tomorrow, but updating your payment info now ensures uninterrupted service.\n\n**Your account at a glance:**\n• Plan: ${customer.plan}\n• Amount: ${Formatters.currency(customer.mrr)}/month\n• Status: Payment pending\n\nReply to this email if you need any assistance!\n\nBest,\nReviveAI Billing Team`
      },
      'Concerned': {
        subject: `Your ${customer.company} account needs attention`,
        body: `Hi ${customer.name.split(' ')[0]},\n\nWe've been trying to process your payment of ${Formatters.currency(customer.mrr)} for the past week, but unfortunately, our attempts haven't been successful.\n\nWe value ${customer.company} as a customer and want to make sure you continue enjoying your ${customer.plan} plan benefits.\n\n⚠️ **What happens next:**\n• Your account will remain active for 7 more days\n• After that, some features may become restricted\n• All your data is safe and will be preserved\n\n**To resolve this immediately:**\n→ Update your payment method at [billing link]\n→ Or contact us to discuss alternative arrangements\n\nWe're happy to work with you on this. Sometimes a quick call is the fastest way to sort things out.\n\nRegards,\nReviveAI Support Team`
      },
      'Urgent': {
        subject: `⚠️ Action required: ${customer.company} account suspension notice`,
        body: `Dear ${customer.name},\n\nDespite multiple attempts, we've been unable to process your payment of ${Formatters.currency(customer.mrr)} for your ${customer.plan} plan.\n\n🚨 **Important: Your account will be suspended in 48 hours** unless payment is received.\n\n**What you'll lose access to:**\n• All ${customer.plan} plan features\n• API integrations and data exports\n• Team collaboration tools\n• Priority support\n\n**Resolve now in 30 seconds:**\n1. Click here to update your payment → [Update Payment]\n2. Your service will be immediately restored\n\nIf you're experiencing financial difficulties, please reach out. We have flexible options including:\n• Temporary plan downgrade\n• Payment plan arrangements\n• Extended grace period\n\nWe truly don't want to lose you as a customer.\n\nSincerely,\nReviveAI Account Management`
      }
    };

    return emails[tone] || emails['Friendly'];
  }

  // Get suggested chat queries
  function getSuggestions() {
    return [
      'How much revenue did we recover this month?',
      'Which customers are most likely to churn?',
      'Analyze our failed payment patterns',
      'Should we change our pricing?',
      'What\'s our MRR growth trend?',
      'Show me our recovery rate breakdown'
    ];
  }

  return {
    streamResponse,
    getResponse,
    generateDunningEmail,
    getSuggestions
  };
})();
