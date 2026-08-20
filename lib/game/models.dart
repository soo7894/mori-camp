enum FacilityKind { tent, toilet, shop, campfire, cabin }

extension FacilityKindData on FacilityKind {
  String get label => switch (this) {
        FacilityKind.tent => '텐트 사이트',
        FacilityKind.toilet => '화장실',
        FacilityKind.shop => '숲속 매점',
        FacilityKind.campfire => '모닥불장',
        FacilityKind.cabin => '글램핑 오두막',
      };

  String get description => switch (this) {
        FacilityKind.tent => '캠퍼 2명을 받을 수 있어요.',
        FacilityKind.toilet => '청결과 만족도를 높여요.',
        FacilityKind.shop => '손님 한 명당 수익이 늘어요.',
        FacilityKind.campfire => '저녁 만족도와 평판을 높여요.',
        FacilityKind.cabin => '캠퍼 4명과 높은 숙박 수익을 제공해요.',
      };

  int get cost => switch (this) {
        FacilityKind.tent => 240,
        FacilityKind.toilet => 380,
        FacilityKind.shop => 520,
        FacilityKind.campfire => 300,
        FacilityKind.cabin => 850,
      };

  int get capacity => switch (this) {
        FacilityKind.tent => 2,
        FacilityKind.cabin => 4,
        _ => 0,
      };

  int get happiness => switch (this) {
        FacilityKind.toilet => 8,
        FacilityKind.shop => 4,
        FacilityKind.campfire => 7,
        FacilityKind.cabin => 5,
        FacilityKind.tent => 1,
      };

  int get dailyIncomeBonus => switch (this) {
        FacilityKind.shop => 12,
        FacilityKind.cabin => 18,
        _ => 0,
      };
}

class CampFacility {
  const CampFacility({
    required this.id,
    required this.kind,
    required this.gridX,
    required this.gridZ,
  });

  final int id;
  final FacilityKind kind;
  final double gridX;
  final double gridZ;
}

class DailyReport {
  const DailyReport({
    required this.day,
    required this.guests,
    required this.income,
    required this.upkeep,
    required this.reputationEarned,
  });

  final int day;
  final int guests;
  final int income;
  final int upkeep;
  final int reputationEarned;

  int get profit => income - upkeep;
}
