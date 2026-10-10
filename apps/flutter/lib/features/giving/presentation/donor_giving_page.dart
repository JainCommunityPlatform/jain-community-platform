import 'package:flutter/material.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/api_client.dart';
import '../data/giving_repository.dart';

class DonorGivingPage extends StatefulWidget {
  const DonorGivingPage({required this.api, super.key});

  final ApiClient api;

  @override
  State<DonorGivingPage> createState() => _DonorGivingPageState();
}

class _DonorGivingPageState extends State<DonorGivingPage> {
  late final GivingRepository _repository = GivingRepository(widget.api);
  List<GivingCampaign> _campaigns = [];
  List<DonorPledge> _pledges = [];
  List<DonorReceipt> _receipts = [];
  List<DonorNotification> _notifications = [];
  bool _loading = true;
  bool _submitting = false;
  Object? _error;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repository.listCampaigns(),
        _repository.listMyPledges(),
        _repository.listMyReceipts(),
        _repository.listMyNotifications(),
      ]);
      if (!mounted) return;
      setState(() {
        _campaigns = results[0] as List<GivingCampaign>;
        _pledges = results[1] as List<DonorPledge>;
        _receipts = results[2] as List<DonorReceipt>;
        _notifications = results[3] as List<DonorNotification>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  Future<void> _makePledge(GivingCampaign campaign) async {
    final amountController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final amount = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Pledge to ${campaign.name}'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Pledge amount (₹)',
              prefixText: '₹ ',
              helperText: 'You can make a partial payment later through the temple finance team.',
            ),
            validator: (value) {
              final parsed = double.tryParse((value ?? '').trim());
              if (parsed == null || !parsed.isFinite || parsed <= 0 || parsed > 1000000000) {
                return 'Enter a valid amount greater than zero';
              }
              if ((parsed * 100).round() <= 0) return 'Amount is too small';
              return null;
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(dialogContext, double.parse(amountController.text.trim()));
              }
            },
            child: const Text('Confirm pledge'),
          ),
        ],
      ),
    );
    amountController.dispose();
    if (amount == null || !mounted) return;

    setState(() => _submitting = true);
    try {
      await _repository.createPledge(
        campaignId: campaign.id,
        pledgedAmountPaise: (amount * 100).round(),
        idempotencyKey: 'donor-pledge-${campaign.id}-${DateTime.now().microsecondsSinceEpoch}',
      );
      await _load();
      if (!mounted) return;
      setState(() => _selectedTab = 1);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your pledge has been recorded.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(error))),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _markNotificationRead(DonorNotification notification) async {
    if (notification.isRead) return;
    try {
      await _repository.markNotificationRead(notification.id);
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(error))),
      );
    }
  }

  String _friendlyError(Object error) {
    if (error is ApiException) return error.message;
    return 'Could not complete the request. Please try again.';
  }

  String _money(int paise) => '₹${(paise / 100).toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Support & Donate'),
        actions: [
          IconButton(
            tooltip: 'Refresh giving data',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 0, label: Text('Campaigns'), icon: Icon(Icons.volunteer_activism)),
                ButtonSegment(value: 1, label: Text('My pledges'), icon: Icon(Icons.favorite_outline)),
                ButtonSegment(value: 2, label: Text('Receipts'), icon: Icon(Icons.receipt_long_outlined)),
                ButtonSegment(value: 3, label: Text('Notifications'), icon: Icon(Icons.notifications_outlined)),
              ],
              selected: {_selectedTab},
              onSelectionChanged: (value) => setState(() => _selectedTab = value.first),
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _friendlyError(_error!), onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _selectedTab == 0
                      ? _campaignList()
                      : _selectedTab == 1
                          ? _pledgeList()
                          : _selectedTab == 2
                              ? _receiptList()
                              : _notificationList(),
                ),
      bottomNavigationBar: _submitting
          ? const LinearProgressIndicator(minHeight: 3)
          : null,
    );
  }

  Widget _campaignList() {
    if (_campaigns.isEmpty) {
      return _emptyList('No active campaigns right now', 'Please check again later.');
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Choose a cause you would like to support.', style: TextStyle(fontSize: 15)),
        const SizedBox(height: 12),
        for (final campaign in _campaigns)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    CircleAvatar(child: Icon(Icons.temple_hindu_outlined, color: Theme.of(context).colorScheme.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: Text(campaign.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))),
                  ]),
                  if (campaign.description.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(campaign.description),
                  ],
                  if (campaign.targetAmountPaise != null) ...[
                    const SizedBox(height: 10),
                    Text('Campaign target: ${_money(campaign.targetAmountPaise!)}'),
                  ],
                  const SizedBox(height: 14),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.icon(
                      onPressed: _submitting ? null : () => _makePledge(campaign),
                      icon: const Icon(Icons.favorite_outline),
                      label: const Text('Make a pledge'),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _pledgeList() {
    if (_pledges.isEmpty) return _emptyList('No pledges yet', 'Choose a campaign to record your first pledge.');
    final names = {for (final campaign in _campaigns) campaign.id: campaign.name};
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        for (final pledge in _pledges)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.favorite_outline)),
              title: Text(names[pledge.campaignId] ?? 'Donation pledge'),
              subtitle: Text('${_money(pledge.paidAmountPaise)} paid • ${_money(pledge.outstandingAmountPaise)} outstanding\nStatus: ${pledge.status.replaceAll('_', ' ')}'),
              isThreeLine: true,
              trailing: Text(_money(pledge.pledgedAmountPaise), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('For payment recording or payment verification, contact the temple finance team. Receipts appear here after verification.'),
        ),
      ],
    );
  }

  Widget _receiptList() {
    if (_receipts.isEmpty) return _emptyList('No receipts yet', 'Verified donations will appear here with their receipt numbers.');
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        for (final receipt in _receipts)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.receipt_long_outlined)),
              title: Text(receipt.receiptNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('${receipt.method.replaceAll('_', ' ')} • ${receipt.issuedAt == null ? 'Date unavailable' : MaterialLocalizations.of(context).formatMediumDate(receipt.issuedAt!.toLocal())}'),
              trailing: Text(_money(receipt.amountPaise), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
      ],
    );
  }

  Widget _notificationList() {
    if (_notifications.isEmpty) {
      return _emptyList('No notifications yet', 'Pledge and payment updates will appear here.');
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        for (final notification in _notifications)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: CircleAvatar(
                child: Icon(notification.isRead ? Icons.notifications_none : Icons.notifications_active_outlined),
              ),
              title: Text(notification.title, style: TextStyle(fontWeight: notification.isRead ? FontWeight.normal : FontWeight.w700)),
              subtitle: Text(
                notification.createdAt == null
                    ? notification.body
                    : '${notification.body}\n${MaterialLocalizations.of(context).formatMediumDate(notification.createdAt!.toLocal())}',
              ),
              isThreeLine: true,
              trailing: notification.isRead
                  ? const Icon(Icons.check_circle_outline)
                  : IconButton(
                      tooltip: 'Mark as read',
                      onPressed: () => _markNotificationRead(notification),
                      icon: const Icon(Icons.mark_email_read_outlined),
                    ),
              onTap: notification.isRead ? null : () => _markNotificationRead(notification),
            ),
          ),
      ],
    );
  }

  Widget _emptyList(String title, String subtitle) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 60),
          Icon(Icons.volunteer_activism_outlined, size: 48, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center),
        ],
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined, size: 44),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
            ],
          ),
        ),
      );
}
