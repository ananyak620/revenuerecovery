/* ============================================
   ReviveAI — Mock Data Generator
   Realistic SaaS revenue & customer data
   ============================================ */

const MockData = (() => {
  // --- Helpers ---
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
  const pick = (arr) => arr[rand(0, arr.length - 1)];
  const uuid = () => 'cus_' + Math.random().toString(36).substring(2, 10);

  const firstNames = ['Sarah', 'James', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'Alexander', 'Isabella', 'Daniel', 'Mia', 'David', 'Charlotte', 'Joseph', 'Amelia', 'Andrew', 'Harper', 'Ryan', 'Evelyn', 'Nathan', 'Aria', 'Lucas', 'Grace', 'Ethan', 'Chloe', 'Mason', 'Lily', 'Logan', 'Zoe', 'Aiden'];
  const lastNames = ['Johnson', 'Chen', 'Williams', 'Patel', 'Brown', 'Kim', 'Davis', 'Martinez', 'Anderson', 'Thomas', 'Wilson', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'Garcia', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young'];
  const companies = ['TechFlow Inc', 'DataVerse Co', 'CloudNine Ltd', 'PixelForge', 'NovaStar Systems', 'Quantum Leap AI', 'ByteShift Labs', 'Zenith Digital', 'IronClad Security', 'PulsePoint Analytics', 'AeroStack', 'BlueWave SaaS', 'CrystalEdge', 'DriftSync', 'EverScale', 'FusionGrid', 'HyperLoop Tech', 'InfinityOps', 'JetStream Cloud', 'KineticaAI'];
  const plans = ['Starter', 'Professional', 'Business', 'Enterprise'];
  const planPrices = { 'Starter': 29, 'Professional': 79, 'Business': 199, 'Enterprise': 499 };
  const industries = ['SaaS', 'E-Commerce', 'FinTech', 'HealthTech', 'EdTech', 'MarTech', 'AI/ML', 'DevTools', 'Cybersecurity', 'Analytics'];
  const churnReasons = [
    'Declining product usage over 30 days',
    'Multiple failed payment attempts',
    'Downgraded plan recently',
    'No login in 14+ days',
    'Opened 5+ support tickets',
    'Competitor evaluation detected',
    'Contract renewal approaching',
    'Feature request unresolved for 60+ days',
    'Negative NPS score submitted',
    'Budget cuts mentioned in support chat'
  ];
  const retentionActions = [
    'Schedule personal onboarding call',
    'Offer 20% discount for annual commitment',
    'Assign dedicated customer success manager',
    'Provide premium feature trial extension',
    'Send personalized usage tips email',
    'Invite to exclusive product webinar',
    'Offer migration assistance package',
    'Connect with power users community'
  ];
  const failReasons = ['Card expired', 'Insufficient funds', 'Card declined', 'Bank declined', 'Network error', 'Invalid card', 'Fraud prevention', 'Payment limit exceeded'];

  // --- Generate Customers ---
  function generateCustomers(count = 50) {
    const customers = [];
    for (let i = 0; i < count; i++) {
      const firstName = pick(firstNames);
      const lastName = pick(lastNames);
      const plan = pick(plans);
      const baseMrr = planPrices[plan] + rand(-5, 50);
      const riskScore = rand(5, 98);
      const riskLevel = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
      const daysAgo = rand(1, 365);
      const joinDate = new Date(Date.now() - daysAgo * 86400000);
      const lastActive = new Date(Date.now() - rand(0, 30) * 86400000);

      customers.push({
        id: uuid(),
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(companies).toLowerCase().replace(/\s/g, '')}.com`,
        company: pick(companies),
        plan,
        baseMrr,
        mrr: baseMrr,
        industry: pick(industries),
        riskScore,
        riskLevel,
        churnReason: riskScore > 40 ? pick(churnReasons) : 'Healthy engagement',
        retentionAction: riskScore > 40 ? pick(retentionActions) : 'Continue monitoring',
        joinDate: joinDate.toISOString().split('T')[0],
        lastActive: lastActive.toISOString().split('T')[0],
        loginFrequency: riskScore > 60 ? rand(0, 3) : rand(5, 20),
        supportTickets: riskScore > 50 ? rand(3, 12) : rand(0, 2),
        npsScore: riskScore > 60 ? rand(1, 4) : rand(7, 10),
        featureAdoption: riskScore > 50 ? rand(10, 40) : rand(60, 95),
        avatar: `${firstName[0]}${lastName[0]}`
      });
    }
    return customers.sort((a, b) => b.riskScore - a.riskScore);
  }

  // --- Generate Failed Payments ---
  function generateFailedPayments(customers, count = 30) {
    const payments = [];
    const statuses = ['pending_retry', 'retrying', 'recovered', 'failed', 'scheduled'];
    const retryMethods = ['Smart retry', 'Card updater', 'Alternative method', 'Direct debit fallback'];

    for (let i = 0; i < count; i++) {
      const customer = pick(customers);
      const amount = customer.mrr + randFloat(-10, 10);
      const status = pick(statuses);
      const failDate = new Date(Date.now() - rand(0, 14) * 86400000);
      const retryCount = rand(0, 4);

      payments.push({
        id: 'pay_' + Math.random().toString(36).substring(2, 10),
        customerId: customer.id,
        customerName: customer.name,
        company: customer.company,
        email: customer.email,
        amount,
        status,
        failReason: pick(failReasons),
        failDate: failDate.toISOString(),
        retryCount,
        maxRetries: 4,
        nextRetry: status === 'pending_retry' ? new Date(Date.now() + rand(1, 48) * 3600000).toISOString() : null,
        retryMethod: pick(retryMethods),
        recovered: status === 'recovered',
        recoveredAmount: status === 'recovered' ? amount : 0
      });
    }
    return payments;
  }

  // --- Generate Revenue Data ---
  function generateRevenueData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const data = [];
    let base = 85000;

    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth - 11 + i + 12) % 12;
      const revenue = base + rand(-5000, 12000);
      const recovered = rand(3000, 15000);
      const lost = rand(2000, 10000);
      base = revenue;

      data.push({
        month: months[monthIndex],
        revenue,
        recovered,
        lost,
        net: revenue + recovered - lost,
        newMrr: rand(5000, 20000),
        churnedMrr: rand(2000, 8000),
        expansionMrr: rand(3000, 12000)
      });
    }
    return data;
  }

  // --- Generate Dashboard Stats ---
  function generateDashboardStats() {
    return {
      totalRevenue: rand(120000, 180000),
      recoveredRevenue: rand(18000, 45000),
      atRiskRevenue: rand(25000, 55000),
      recoveryRate: rand(62, 89),
      activeCustomers: rand(800, 1500),
      churnRate: randFloat(2.1, 5.8),
      mrr: rand(95000, 150000),
      arr: rand(1100000, 1800000),
      avgRevenuePerUser: rand(80, 250),
      paymentFailureRate: randFloat(3.2, 8.5),
      dunningSuccessRate: rand(55, 78),
      retrySuccessRate: rand(45, 72),
      totalRecoveryAttempts: rand(200, 500),
      successfulRecoveries: rand(120, 350)
    };
  }

  // --- Generate Live Feed ---
  function generateFeedItems(count = 20) {
    const types = [
      { text: (c, a) => `Payment recovered from <strong>${c}</strong>`, type: 'success', amountType: 'positive' },
      { text: (c, a) => `Failed payment from <strong>${c}</strong>`, type: 'danger', amountType: 'negative' },
      { text: (c, a) => `Smart retry successful for <strong>${c}</strong>`, type: 'success', amountType: 'positive' },
      { text: (c, a) => `Churn risk detected for <strong>${c}</strong>`, type: 'warning', amountType: 'negative' },
      { text: (c, a) => `Dunning email sent to <strong>${c}</strong>`, type: 'info', amountType: null },
      { text: (c, a) => `Customer <strong>${c}</strong> upgraded plan`, type: 'success', amountType: 'positive' },
      { text: (c, a) => `Invoice overdue for <strong>${c}</strong>`, type: 'danger', amountType: 'negative' }
    ];
    const items = [];

    for (let i = 0; i < count; i++) {
      const template = pick(types);
      const company = pick(companies);
      const amount = randFloat(29, 499);
      const minutesAgo = rand(1, 180);

      items.push({
        id: i,
        html: template.text(company, amount),
        type: template.type,
        amount: template.amountType ? (template.amountType === 'positive' ? `+$${amount}` : `-$${amount}`) : null,
        rawAmount: amount,
        amountType: template.amountType,
        time: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`
      });
    }
    return items;
  }

  // --- Dunning Sequences ---
  function getDunningSequence() {
    return [
      { day: 'Day 0', type: 'Payment Failed', tone: 'Friendly', subject: 'Quick heads up about your payment' },
      { day: 'Day 3', type: 'First Reminder', tone: 'Helpful', subject: 'Let\'s get your payment sorted' },
      { day: 'Day 7', type: 'Second Reminder', tone: 'Concerned', subject: 'Your account needs attention' },
      { day: 'Day 14', type: 'Final Notice', tone: 'Urgent', subject: 'Action required to avoid service disruption' }
    ];
  }

  // --- Pricing Data ---
  function getPricingData() {
    return {
      currentPrice: 79,
      optimalPrice: 89,
      elasticity: -1.4,
      priceRange: { min: 49, max: 149 },
      competitors: [
        { name: 'Standard Gateway Retries', type: 'Native Blind Retries', price: 0, recoveryRate: '28.4%', features: 'Fixed static schedule, zero ML intelligence' },
        { name: 'Legacy Dunning Software', type: 'Baremetrics / Churn Buster', price: 89, recoveryRate: '38.2%', features: 'Email sequences only, no instant payment links' },
        { name: 'Manual Finance Ops', type: 'Internal Billing Team', price: 149, recoveryRate: '44.0%', features: 'Slow phone/email outreach, high manual overhead' },
        { name: 'Generic Rule Engine', type: 'Legacy Billing Rules', price: 59, recoveryRate: '32.1%', features: 'Static if-else rules without adaptive learning' }
      ],
      discountAnalysis: [
        { discount: '10%', conversions: '+12%', revenue: '+8%', retention: '+5%' },
        { discount: '20%', conversions: '+24%', revenue: '+4%', retention: '+11%' },
        { discount: '30%', conversions: '+35%', revenue: '-8%', retention: '+18%' },
        { discount: '50%', conversions: '+52%', revenue: '-22%', retention: '+25%' }
      ],
      revenueProjections: function(price) {
        const base = 150000;
        const diff = price - 79;
        const elasticEffect = diff * -1.4 * 100;
        const projected = base + elasticEffect + rand(-2000, 2000);
        return {
          projected: Math.max(50000, projected),
          customers: Math.max(200, Math.round(1200 - diff * 8)),
          arpu: price,
          change: ((projected - base) / base * 100).toFixed(1)
        };
      }
    };
  }

  // Initialize data
  const customers = generateCustomers(50);
  const failedPayments = generateFailedPayments(customers, 30);
  const revenueData = generateRevenueData();
  const stats = generateDashboardStats();
  const feedItems = generateFeedItems(20);
  const dunningSequence = getDunningSequence();
  const pricingData = getPricingData();

  // Dynamic Portfolio Volume & Amount Scaling
  let portfolioVolume = 1000000; // Default ₹10 Lakhs
  let portfolioAOV = 2500;       // Default ₹2,500

  function getVolume() {
    return portfolioVolume;
  }

  function getAOV() {
    return portfolioAOV;
  }

  function getVolumeScale() {
    return Math.max(0.1, portfolioVolume / 1000000);
  }

  function getAtRiskMRR(filter = 'at_risk') {
    let list = customers;
    if (filter === 'at_risk') {
      list = customers.filter(c => c.riskScore >= 60);
    } else if (filter !== 'all') {
      list = customers.filter(c => c.riskLevel === filter);
    }
    return list.reduce((sum, c) => sum + (c.mrr || 0), 0);
  }

  stats.baseMrr = stats.mrr;
  stats.baseChurnRate = stats.churnRate;

  function setVolume(vol, aovVal) {
    if (vol !== undefined && vol !== null && !isNaN(vol)) portfolioVolume = Number(vol);
    if (aovVal !== undefined && aovVal !== null && !isNaN(aovVal)) portfolioAOV = Number(aovVal);

    const scale = getVolumeScale();
    customers.forEach(c => {
      c.mrr = Math.max(12, Math.round(c.baseMrr * scale));
    });

    failedPayments.forEach(p => {
      const cust = customers.find(c => c.id === p.customerId);
      if (cust) {
        p.amount = cust.mrr;
        if (p.recovered) p.recoveredAmount = cust.mrr;
      }
    });

    stats.mrr = Math.round((stats.baseMrr || 110000) * scale);
    stats.atRiskRevenue = getAtRiskMRR('at_risk');
    stats.recoveredRevenue = Math.round(stats.atRiskRevenue * 0.742);

    window.dispatchEvent(new CustomEvent('portfolioChange', {
      detail: {
        volume: portfolioVolume,
        aov: portfolioAOV,
        atRiskMRR: stats.atRiskRevenue,
        mrr: stats.mrr,
        scale: scale
      }
    }));
  }

  // Initial sync so stats reflect real customer MRR sums
  setVolume(portfolioVolume, portfolioAOV);

  return {
    customers,
    failedPayments,
    revenueData,
    stats,
    feedItems,
    dunningSequence,
    pricingData,
    generateFeedItems,
    generateDashboardStats,
    getVolume,
    getAOV,
    getVolumeScale,
    getAtRiskMRR,
    setVolume
  };
})();
