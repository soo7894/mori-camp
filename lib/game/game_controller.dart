import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'models.dart';

class CampGameController extends ChangeNotifier {
  CampGameController({Random? random}) : _random = random ?? Random() {
    _facilities.addAll(const [
      CampFacility(
        id: 1,
        kind: FacilityKind.tent,
        gridX: -3.8,
        gridZ: -2.8,
      ),
      CampFacility(
        id: 2,
        kind: FacilityKind.tent,
        gridX: 0.0,
        gridZ: -3.4,
      ),
      CampFacility(
        id: 3,
        kind: FacilityKind.toilet,
        gridX: 4.4,
        gridZ: -2.8,
      ),
      CampFacility(
        id: 4,
        kind: FacilityKind.campfire,
        gridX: -0.5,
        gridZ: 2.2,
      ),
    ]);
  }

  final Random _random;
  final List<CampFacility> _facilities = [];
  Timer? _ticker;
  int _nextFacilityId = 5;

  int day = 1;
  int minutes = 8 * 60;
  int money = 1200;
  int reputation = 8;
  int cleanliness = 88;
  int guests = 3;
  bool isPaused = false;
  int speed = 1;
  DailyReport? lastReport;

  List<CampFacility> get facilities => List.unmodifiable(_facilities);

  int get capacity => _facilities.fold(
        0,
        (sum, facility) => sum + facility.kind.capacity,
      );

  int get facilityHappiness => _facilities.fold(
        0,
        (sum, facility) => sum + facility.kind.happiness,
      );

  int get satisfaction {
    final occupancyPenalty = guests > capacity ? (guests - capacity) * 12 : 0;
    final score = 36 + cleanliness * 0.42 + facilityHappiness - occupancyPenalty;
    return score.clamp(0, 100).round();
  }

  int get projectedIncome {
    final bonus = _facilities.fold(
      0,
      (sum, facility) => sum + facility.kind.dailyIncomeBonus,
    );
    return guests * (46 + bonus);
  }

  String get timeLabel {
    final hour = minutes ~/ 60;
    final minute = minutes % 60;
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
  }

  bool get isNight => minutes >= 18 * 60;

  void start() {
    _ticker ??= Timer.periodic(const Duration(milliseconds: 850), (_) {
      if (!isPaused) {
        advanceTime(10 * speed);
      }
    });
  }

  void togglePause() {
    isPaused = !isPaused;
    notifyListeners();
  }

  void cycleSpeed() {
    speed = speed == 3 ? 1 : speed + 1;
    notifyListeners();
  }

  void advanceTime(int amount) {
    final previousHour = minutes ~/ 60;
    minutes += amount;

    if (minutes >= 22 * 60) {
      finishDay();
      return;
    }

    if (minutes ~/ 60 != previousHour) {
      _updateGuests();
      cleanliness = max(18, cleanliness - max(1, guests ~/ 3));
    }
    notifyListeners();
  }

  void _updateGuests() {
    final timeDemand = switch (minutes ~/ 60) {
      >= 17 && <= 20 => 3,
      >= 12 && <= 16 => 2,
      _ => 1,
    };
    final reputationDemand = reputation ~/ 25;
    final desired = 1 + timeDemand + reputationDemand + _random.nextInt(3);
    guests = min(capacity, desired);
  }

  bool build(FacilityKind kind) {
    if (money < kind.cost || _facilities.length >= _buildSlots.length) {
      return false;
    }

    final slot = _buildSlots[_facilities.length];
    money -= kind.cost;
    _facilities.add(
      CampFacility(
        id: _nextFacilityId++,
        kind: kind,
        gridX: slot.$1,
        gridZ: slot.$2,
      ),
    );
    guests = min(capacity, guests + kind.capacity);
    notifyListeners();
    return true;
  }

  bool cleanCamp() {
    if (money < 60 || cleanliness >= 100) {
      return false;
    }
    money -= 60;
    cleanliness = min(100, cleanliness + 25);
    notifyListeners();
    return true;
  }

  DailyReport finishDay() {
    final upkeep = 24 + _facilities.length * 8;
    final income = projectedIncome;
    final earnedReputation = max(0, (satisfaction - 55) ~/ 5);

    money += income - upkeep;
    reputation += earnedReputation;
    lastReport = DailyReport(
      day: day,
      guests: guests,
      income: income,
      upkeep: upkeep,
      reputationEarned: earnedReputation,
    );

    day += 1;
    minutes = 8 * 60;
    cleanliness = min(100, cleanliness + 12);
    guests = min(capacity, max(1, 2 + reputation ~/ 30));
    notifyListeners();
    return lastReport!;
  }

  static const _buildSlots = <(double, double)>[
    (-3.8, -2.8),
    (0.0, -3.4),
    (4.4, -2.8),
    (-0.5, 2.2),
    (-4.4, 2.6),
    (4.0, 2.5),
    (-5.8, 0.0),
    (5.8, 0.2),
    (-3.0, 5.0),
    (2.2, 5.2),
    (-6.0, 5.0),
    (6.2, 4.8),
  ];

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}
