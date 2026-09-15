import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:go_router/go_router.dart';
import '../app/theme.dart';
import '../core/api_client.dart';
import 'package:intl/intl.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  Map<String, dynamic>? _profileData;
  bool _loading = true;
  bool _checkingIn = false;
  bool _startingPayment = false;
  String? _checkInStatus;
  late final Razorpay _razorpay;
  late AnimationController _pulseController;
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _loadProfile();
  }

  @override
  void dispose() {
    _razorpay.clear();
    _pulseController.dispose();
    _shimmerController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await api.get('/members/me');
      setState(() {
        _profileData = res.data;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _scanAndCheckIn() async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QRScannerPage()),
    );

    if (result != null && mounted) {
      try {
        final Map<String, dynamic> qrData;
        final uri = Uri.tryParse(result);
        if (uri != null && uri.hasScheme) {
          qrData = {
            'gymId': uri.queryParameters['gymId'],
            'hash': uri.queryParameters['hash'],
          };
        } else {
          // Keep accepting older printed QR codes during the transition.
          qrData = jsonDecode(result) as Map<String, dynamic>;
        }
        if (qrData['gymId'] == null || qrData['hash'] == null) {
          throw const FormatException('Invalid gym QR code');
        }
        setState(() {
          _checkingIn = true;
          _checkInStatus = null;
        });

        await api.post('/checkins/qr', data: {
          'gymId': qrData['gymId'],
          'hash': qrData['hash'],
        });

        HapticFeedback.heavyImpact();
        setState(() {
          _checkingIn = false;
          _checkInStatus = 'success';
        });
        _loadProfile(); // Refresh stats

        // Reset status after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _checkInStatus = null);
        });
      } catch (e) {
        HapticFeedback.vibrate();
        setState(() {
          _checkingIn = false;
          _checkInStatus = 'error';
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _checkInStatus = null);
        });
      }
    }
  }

  Future<void> _startOnlinePayment() async {
    if (_startingPayment) return;

    setState(() => _startingPayment = true);
    try {
      final orderRes = await api.post('/payments/razorpay/order');
      final order = orderRes.data as Map<String, dynamic>;
      final amount = ((order['amount'] as num?) ?? 0).toDouble();

      _razorpay.open({
        'key': order['keyId'],
        'amount': (amount * 100).round(),
        'currency': order['currency'] ?? 'INR',
        'name': order['gymName'] ?? 'Gym',
        'description': order['description'] ?? 'Membership payment',
        'order_id': order['orderId'],
        'prefill': {
          'name': order['memberName'],
          'contact': order['memberPhone'],
        },
        'theme': {'color': '#8B5CF6'},
      });
    } catch (e) {
      _showSnack('Could not start payment. Please try again.', isError: true);
    } finally {
      if (mounted) setState(() => _startingPayment = false);
    }
  }

  Future<void> _onPaymentSuccess(PaymentSuccessResponse response) async {
    try {
      await api.post('/payments/razorpay/verify', data: {
        'razorpayOrderId': response.orderId,
        'razorpayPaymentId': response.paymentId,
        'razorpaySignature': response.signature,
      });
      HapticFeedback.mediumImpact();
      _showSnack('Payment successful. Membership updated.');
      await _loadProfile();
    } catch (e) {
      _showSnack(
          'Payment captured but verification failed. Contact the gym desk.',
          isError: true);
    }
  }

  void _onPaymentError(PaymentFailureResponse response) {
    _showSnack(response.message ?? 'Payment cancelled', isError: true);
  }

  void _onExternalWallet(ExternalWalletResponse response) {
    _showSnack('Continue payment in ${response.walletName ?? 'wallet'}');
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.danger : AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final member = _profileData?['member'];
    final sub = _profileData?['subscription'];
    final stats = _profileData?['stats'];
    final attendance =
        (_profileData?['attendanceLast7Days'] as List?)?.cast<String>() ?? [];
    final feeStatus = _profileData?['feeStatus'];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _loading
          ? Center(
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: AppColors.brandGradient,
                ),
                padding: const EdgeInsets.all(12),
                child: const CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2.5,
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadProfile,
              color: AppColors.brandPrimary,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // ─── Premium App Bar ──────────────────
                  SliverAppBar(
                    expandedHeight: 100,
                    floating: true,
                    pinned: false,
                    backgroundColor: Colors.transparent,
                    flexibleSpace: FlexibleSpaceBar(
                      background: Container(
                        padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              'Hey, ${member?['name']?.toString().split(' ').first ?? 'there'}',
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('EEEE, d MMMM').format(DateTime.now()),
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.all(20),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // ─── Premium Check-in Button ──────────────────
                        _buildCheckInButton(stats),

                        const SizedBox(height: 24),

                        // ─── This Week Label ──────────────────
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'This Week',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.brandPrimary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${attendance.length}/7 days',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.brandPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // ─── 7-Day Attendance Strip ───────────
                        _buildWeeklyAttendance(attendance),

                        const SizedBox(height: 24),

                        // ─── Today's Workout Card ─────────────
                        _buildTodaysWorkout(),

                        const SizedBox(height: 24),

                        // ─── Stats Cards ──────────────────────
                        Row(
                          children: [
                            Expanded(
                                child: _StatCard(
                              label: 'Total Visits',
                              value: '${stats?['totalVisits'] ?? 0}',
                              icon: Icons.fitness_center_rounded,
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.brandPrimary.withOpacity(0.2),
                                  AppColors.brandPrimary.withOpacity(0.05)
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              iconColor: AppColors.brandPrimary,
                            )),
                            const SizedBox(width: 12),
                            Expanded(
                                child: _StatCard(
                              label: 'This Month',
                              value: '${stats?['monthVisits'] ?? 0}',
                              icon: Icons.calendar_today_rounded,
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.brandSecondary.withOpacity(0.2),
                                  AppColors.brandSecondary.withOpacity(0.05)
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              iconColor: AppColors.brandSecondary,
                            )),
                            const SizedBox(width: 12),
                            Expanded(
                                child: _StatCard(
                              label: 'Days Left',
                              value: '${sub?['daysRemaining'] ?? 0}',
                              icon: Icons.hourglass_bottom_rounded,
                              gradient: (sub?['daysRemaining'] ?? 0) <= 7
                                  ? LinearGradient(
                                      colors: [
                                        AppColors.danger.withOpacity(0.2),
                                        AppColors.danger.withOpacity(0.05)
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    )
                                  : LinearGradient(
                                      colors: [
                                        AppColors.success.withOpacity(0.2),
                                        AppColors.success.withOpacity(0.05)
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                              iconColor: (sub?['daysRemaining'] ?? 0) <= 7
                                  ? AppColors.danger
                                  : AppColors.success,
                              valueColor: (sub?['daysRemaining'] ?? 0) <= 7
                                  ? AppColors.danger
                                  : null,
                            )),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // ─── Plan Card ────────────────────────
                        if (sub != null) _buildPlanCard(sub, feeStatus),

                        // Fee Warning + Payment CTA
                        if (feeStatus == 'overdue' || feeStatus == 'due') ...[
                          const SizedBox(height: 16),
                          _buildFeeWarning(feeStatus),
                        ],

                        const SizedBox(height: 40),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildCheckInButton(Map<String, dynamic>? stats) {
    final isCheckedIn =
        stats?['checkedInToday'] == true || _checkInStatus == 'success';
    final isError = _checkInStatus == 'error';

    return GestureDetector(
      onTap: _checkingIn ? null : _scanAndCheckIn,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          final pulseValue = _pulseController.value;
          return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: (isCheckedIn
                          ? AppColors.success
                          : isError
                              ? AppColors.danger
                              : AppColors.brandPrimary)
                      .withOpacity(0.3 + (pulseValue * 0.2)),
                  blurRadius: 20 + (pulseValue * 10),
                  spreadRadius: pulseValue * 2,
                ),
              ],
            ),
            child: child,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: isCheckedIn
                ? AppColors.successGradient
                : isError
                    ? AppColors.dangerGradient
                    : AppColors.brandGradient,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.white.withOpacity(0.2),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // Icon container with glass effect
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: _checkingIn
                    ? const Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Icon(
                        isCheckedIn
                            ? Icons.check_circle_rounded
                            : isError
                                ? Icons.error_rounded
                                : Icons.qr_code_scanner_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _checkingIn
                          ? 'Checking in...'
                          : isCheckedIn
                              ? 'You\'re checked in!'
                              : isError
                                  ? 'Check-in failed'
                                  : 'Tap to Check In',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isCheckedIn
                          ? 'Great job showing up today!'
                          : 'Scan QR at gym entrance',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (!_checkingIn && !isCheckedIn && !isError)
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWeeklyAttendance(List<String> attendance) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: List.generate(7, (i) {
          final date = DateTime.now().subtract(Duration(days: 6 - i));
          final dateStr = DateFormat('yyyy-MM-dd').format(date);
          final isPresent = attendance.contains(dateStr);
          final isToday = i == 6;

          return Expanded(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.all(4),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                gradient: isPresent
                    ? LinearGradient(
                        colors: [
                          AppColors.success.withOpacity(0.3),
                          AppColors.success.withOpacity(0.1),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      )
                    : null,
                color: isPresent ? null : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: isToday && !isPresent
                    ? Border.all(
                        color: AppColors.brandPrimary.withOpacity(0.5),
                        width: 1.5)
                    : null,
              ),
              child: Column(
                children: [
                  Text(
                    DateFormat('E').format(date).substring(0, 1),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color:
                          isPresent ? AppColors.success : AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: isPresent ? 10 : 6,
                    height: isPresent ? 10 : 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isPresent
                          ? AppColors.success
                          : AppColors.textMuted.withOpacity(0.3),
                      boxShadow: isPresent
                          ? [
                              BoxShadow(
                                  color: AppColors.success.withOpacity(0.5),
                                  blurRadius: 8)
                            ]
                          : null,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${date.day}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isPresent
                          ? AppColors.textPrimary
                          : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildTodaysWorkout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Today's Workout",
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                color: AppColors.textPrimary,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Day 42 of 90',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.success,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            context.push('/workout');
          },
          child: Container(
            height: 180,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Stack(
              children: [
                // Gradient background
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppColors.brandPrimary.withOpacity(0.15),
                        AppColors.cardDark,
                      ],
                    ),
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      // Category badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.brandPrimary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'HYPERTROPHY FOCUS',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.brandPrimary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Title
                      const Text(
                        'Leg Day - Power II',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Stats
                      const Row(
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.timer_outlined,
                                size: 16,
                                color: AppColors.textMuted,
                              ),
                              SizedBox(width: 4),
                              Text(
                                '75 min',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(width: 16),
                          Row(
                            children: [
                              Icon(
                                Icons.local_fire_department_rounded,
                                size: 16,
                                color: AppColors.textMuted,
                              ),
                              SizedBox(width: 4),
                              Text(
                                '640 kcal',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Arrow indicator
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      size: 18,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlanCard(Map<String, dynamic> sub, String? feeStatus) {
    final daysRemaining = sub['daysRemaining'] ?? 0;
    final isLow = daysRemaining <= 7;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: AppColors.brandGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.card_membership_rounded,
                        color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    sub['planName'] ?? 'Plan',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: feeStatus == 'paid'
                      ? AppColors.success.withOpacity(0.15)
                      : feeStatus == 'due'
                          ? AppColors.warning.withOpacity(0.15)
                          : AppColors.danger.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: feeStatus == 'paid'
                        ? AppColors.success.withOpacity(0.3)
                        : feeStatus == 'due'
                            ? AppColors.warning.withOpacity(0.3)
                            : AppColors.danger.withOpacity(0.3),
                  ),
                ),
                child: Text(
                  feeStatus == 'paid'
                      ? 'Active'
                      : feeStatus == 'due'
                          ? 'Due Soon'
                          : 'Overdue',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: feeStatus == 'paid'
                        ? AppColors.success
                        : feeStatus == 'due'
                            ? AppColors.warning
                            : AppColors.danger,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Expires ${DateFormat('d MMM yyyy').format(DateTime.parse(sub['endDate']))}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                '$daysRemaining days left',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isLow ? AppColors.danger : AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Premium progress bar
          Container(
            height: 8,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(4),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: FractionallySizedBox(
                widthFactor:
                    (1 - ((daysRemaining / 30))).clamp(0.0, 1.0).toDouble(),
                alignment: Alignment.centerLeft,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: isLow
                        ? AppColors.dangerGradient
                        : AppColors.brandGradient,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeeWarning(String feeStatus) {
    final isOverdue = feeStatus == 'overdue';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isOverdue
              ? [
                  AppColors.danger.withOpacity(0.15),
                  AppColors.danger.withOpacity(0.05)
                ]
              : [
                  AppColors.warning.withOpacity(0.15),
                  AppColors.warning.withOpacity(0.05)
                ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOverdue
              ? AppColors.danger.withOpacity(0.3)
              : AppColors.warning.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (isOverdue ? AppColors.danger : AppColors.warning)
                      .withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.warning_rounded,
                  color: isOverdue ? AppColors.danger : AppColors.warning,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOverdue ? 'Payment Overdue' : 'Payment Due Soon',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isOverdue ? AppColors.danger : AppColors.warning,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isOverdue
                          ? 'Please renew to continue access'
                          : 'Renew now to avoid interruption',
                      style: TextStyle(
                        fontSize: 12,
                        color:
                            (isOverdue ? AppColors.danger : AppColors.warning)
                                .withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _startingPayment ? null : _startOnlinePayment,
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isOverdue ? AppColors.danger : AppColors.warning,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                _startingPayment ? 'Processing...' : 'Pay Now',
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Gradient gradient;
  final Color iconColor;
  final Color? valueColor;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    required this.iconColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: valueColor ?? AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── QR Scanner ────────────────────────────────────

class QRScannerPage extends StatefulWidget {
  const QRScannerPage({super.key});

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  bool _scanned = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.close_rounded, color: Colors.white),
          ),
        ),
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_scanned) return;
              final barcode = capture.barcodes.firstOrNull;
              if (barcode?.rawValue != null) {
                _scanned = true;
                HapticFeedback.heavyImpact();
                Navigator.pop(context, barcode!.rawValue);
              }
            },
          ),
          // Gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.7),
                  Colors.transparent,
                  Colors.transparent,
                  Colors.black.withOpacity(0.7),
                ],
                stops: const [0.0, 0.25, 0.75, 1.0],
              ),
            ),
          ),
          // Scan frame
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: AppColors.brandPrimary,
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.brandPrimary.withOpacity(0.3),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Corner decorations
                  ...List.generate(4, (i) {
                    return Positioned(
                      top: i < 2 ? 0 : null,
                      bottom: i >= 2 ? 0 : null,
                      left: i % 2 == 0 ? 0 : null,
                      right: i % 2 == 1 ? 0 : null,
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          border: Border(
                            top: i < 2
                                ? const BorderSide(
                                    color: AppColors.brandPrimary, width: 4)
                                : BorderSide.none,
                            bottom: i >= 2
                                ? const BorderSide(
                                    color: AppColors.brandPrimary, width: 4)
                                : BorderSide.none,
                            left: i % 2 == 0
                                ? const BorderSide(
                                    color: AppColors.brandPrimary, width: 4)
                                : BorderSide.none,
                            right: i % 2 == 1
                                ? const BorderSide(
                                    color: AppColors.brandPrimary, width: 4)
                                : BorderSide.none,
                          ),
                          borderRadius: BorderRadius.only(
                            topLeft: i == 0
                                ? const Radius.circular(24)
                                : Radius.zero,
                            topRight: i == 1
                                ? const Radius.circular(24)
                                : Radius.zero,
                            bottomLeft: i == 2
                                ? const Radius.circular(24)
                                : Radius.zero,
                            bottomRight: i == 3
                                ? const Radius.circular(24)
                                : Radius.zero,
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          // Instructions
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: const Text(
                    'Point camera at gym QR code',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
