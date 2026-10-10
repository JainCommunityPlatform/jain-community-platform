import '../../../core/api/api_client.dart';

class GivingCampaign {
  const GivingCampaign({
    required this.id,
    required this.name,
    required this.description,
    required this.targetAmountPaise,
    required this.status,
  });

  final String id;
  final String name;
  final String description;
  final int? targetAmountPaise;
  final String status;

  factory GivingCampaign.fromJson(Map<String, dynamic> json) => GivingCampaign(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Giving campaign',
        description: json['description'] as String? ?? '',
        targetAmountPaise: (json['targetAmountPaise'] as num?)?.toInt(),
        status: json['status'] as String? ?? 'ACTIVE',
      );
}

class DonorPledge {
  const DonorPledge({
    required this.id,
    required this.campaignId,
    required this.pledgedAmountPaise,
    required this.paidAmountPaise,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String campaignId;
  final int pledgedAmountPaise;
  final int paidAmountPaise;
  final String status;
  final DateTime? createdAt;

  int get outstandingAmountPaise => pledgedAmountPaise - paidAmountPaise;

  factory DonorPledge.fromJson(Map<String, dynamic> json) => DonorPledge(
        id: json['id'] as String,
        campaignId: json['campaignId'] as String,
        pledgedAmountPaise: (json['pledgedAmountPaise'] as num?)?.toInt() ?? 0,
        paidAmountPaise: (json['paidAmountPaise'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? 'PLEDGED',
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );
}

class DonorReceipt {
  const DonorReceipt({
    required this.id,
    required this.receiptNumber,
    required this.amountPaise,
    required this.method,
    required this.issuedAt,
  });

  final String id;
  final String receiptNumber;
  final int amountPaise;
  final String method;
  final DateTime? issuedAt;

  factory DonorReceipt.fromJson(Map<String, dynamic> json) => DonorReceipt(
        id: json['id'] as String,
        receiptNumber: json['receiptNumber'] as String? ?? 'Receipt',
        amountPaise: (json['amountPaise'] as num?)?.toInt() ?? 0,
        method: json['method'] as String? ?? '',
        issuedAt: DateTime.tryParse(json['issuedAt'] as String? ?? ''),
      );
}

class GivingRepository {
  const GivingRepository(this.api);

  final ApiClient api;

  Future<List<GivingCampaign>> listCampaigns() async =>
      (await api.getList('/api/giving/campaigns'))
          .map((item) => GivingCampaign.fromJson(item as Map<String, dynamic>))
          .toList();

  Future<List<DonorPledge>> listMyPledges() async =>
      (await api.getList('/api/giving/my-pledges'))
          .map((item) => DonorPledge.fromJson(item as Map<String, dynamic>))
          .toList();

  Future<List<DonorReceipt>> listMyReceipts() async =>
      (await api.getList('/api/giving/my-receipts'))
          .map((item) => DonorReceipt.fromJson(item as Map<String, dynamic>))
          .toList();

  Future<DonorPledge> createPledge({
    required String campaignId,
    required int pledgedAmountPaise,
    required String idempotencyKey,
  }) async =>
      DonorPledge.fromJson(await api.post(
        '/api/giving/pledges',
        headers: {'Idempotency-Key': idempotencyKey},
        body: {
          'campaignId': campaignId,
          'pledgedAmountPaise': pledgedAmountPaise,
        },
      ));
}
