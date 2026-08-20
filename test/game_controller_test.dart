import 'dart:math';

import 'package:camp_tycoon/game/game_controller.dart';
import 'package:camp_tycoon/game/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CampGameController', () {
    test('starts with a playable campground', () {
      final game = CampGameController(random: Random(1));

      expect(game.day, 1);
      expect(game.facilities, hasLength(4));
      expect(game.capacity, 4);
      expect(game.money, 1200);
      expect(game.satisfaction, inInclusiveRange(0, 100));
    });

    test('building a tent spends money and adds capacity', () {
      final game = CampGameController(random: Random(1));
      final previousMoney = game.money;
      final previousCapacity = game.capacity;

      expect(game.build(FacilityKind.tent), isTrue);
      expect(game.money, previousMoney - FacilityKind.tent.cost);
      expect(game.capacity, previousCapacity + FacilityKind.tent.capacity);
    });

    test('finishing a day advances the simulation and creates a report', () {
      final game = CampGameController(random: Random(1));

      final report = game.finishDay();

      expect(report.day, 1);
      expect(report.income, greaterThan(0));
      expect(game.day, 2);
      expect(game.minutes, 8 * 60);
      expect(game.lastReport, same(report));
    });
  });
}
