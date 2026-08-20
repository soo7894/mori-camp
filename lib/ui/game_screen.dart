import 'package:flutter/material.dart';

import '../game/camp_scene.dart';
import '../game/game_controller.dart';
import '../game/models.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({required this.controller, super.key});

  final CampGameController controller;

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  @override
  void dispose() {
    widget.controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: widget.controller,
        builder: (context, _) {
          final game = widget.controller;
          return Stack(
            fit: StackFit.expand,
            children: [
              CampScene(controller: game),
              IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.18),
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.25),
                      ],
                      stops: const [0, 0.45, 1],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 16),
                  child: Column(
                    children: [
                      _TopBar(game: game),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _MissionCard(game: game),
                      ),
                      const Spacer(),
                      _BottomControls(
                        game: game,
                        onBuild: () => _showBuildSheet(context),
                        onClean: () => _cleanCamp(context),
                        onFinishDay: () => _finishDay(context),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _cleanCamp(BuildContext context) {
    final success = widget.controller.cleanCamp();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? '캠핑장을 깨끗하게 정리했어요.' : '청소할 필요가 없거나 골드가 부족해요.'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _finishDay(BuildContext context) {
    final report = widget.controller.finishDay();
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${report.day}일차 영업 종료'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('방문 캠퍼  ${report.guests}명'),
            Text('매출  ${report.income} G'),
            Text('유지비  -${report.upkeep} G'),
            const Divider(),
            Text(
              '오늘의 이익  ${report.profit} G',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            Text('평판  +${report.reputationEarned}'),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('다음 날 시작'),
          ),
        ],
      ),
    );
  }

  void _showBuildSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '캠핑장 건설',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              const Text('시설은 빈 구역에 자동으로 배치됩니다.'),
              const SizedBox(height: 14),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: FacilityKind.values.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final kind = FacilityKind.values[index];
                    return _BuildTile(
                      kind: kind,
                      affordable: widget.controller.money >= kind.cost,
                      onTap: () {
                        final built = widget.controller.build(kind);
                        Navigator.pop(sheetContext);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              built
                                  ? '${kind.label} 건설을 완료했어요!'
                                  : '골드가 부족하거나 더 이상 지을 공간이 없어요.',
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.game});

  final CampGameController game;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _HudPill(
            icon: Icons.calendar_today_rounded,
            label: '${game.day}일차',
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: _HudPill(
            icon: game.isNight ? Icons.nightlight_round : Icons.wb_sunny_rounded,
            label: game.timeLabel,
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: _HudPill(
            icon: Icons.monetization_on_rounded,
            label: '${game.money} G',
            accent: const Color(0xFFFFC857),
          ),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: _HudPill(
            icon: Icons.favorite_rounded,
            label: '${game.reputation}',
            accent: const Color(0xFFFF7A73),
          ),
        ),
      ],
    );
  }
}

class _HudPill extends StatelessWidget {
  const _HudPill({
    required this.icon,
    required this.label,
    this.accent = Colors.white,
  });

  final IconData icon;
  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: const Color(0xD92B3D33),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white24),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          children: [
            Icon(icon, color: accent, size: 17),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  const _MissionCard({required this.game});

  final CampGameController game;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 230),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xEFFFFFF1),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 14, offset: Offset(0, 5)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '오늘의 캠핑장',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          _StatLine(
            icon: Icons.people_alt_rounded,
            label: '캠퍼',
            value: '${game.guests} / ${game.capacity}',
          ),
          _StatLine(
            icon: Icons.sentiment_satisfied_alt_rounded,
            label: '만족도',
            value: '${game.satisfaction}%',
          ),
          _StatLine(
            icon: Icons.cleaning_services_rounded,
            label: '청결도',
            value: '${game.cleanliness}%',
          ),
          const SizedBox(height: 7),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: game.satisfaction / 100,
              minHeight: 7,
              backgroundColor: const Color(0xFFDDE5D7),
              color: game.satisfaction >= 75
                  ? const Color(0xFF3D8B63)
                  : const Color(0xFFE3A239),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatLine extends StatelessWidget {
  const _StatLine({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 17, color: const Color(0xFF3D6C52)),
          const SizedBox(width: 7),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _BottomControls extends StatelessWidget {
  const _BottomControls({
    required this.game,
    required this.onBuild,
    required this.onClean,
    required this.onFinishDay,
  });

  final CampGameController game;
  final VoidCallback onBuild;
  final VoidCallback onClean;
  final VoidCallback onFinishDay;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            _RoundButton(
              icon: game.isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
              tooltip: game.isPaused ? '계속하기' : '일시정지',
              onPressed: game.togglePause,
            ),
            const SizedBox(width: 8),
            _RoundButton(
              text: '×${game.speed}',
              tooltip: '게임 속도',
              onPressed: game.cycleSpeed,
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xE6293A31),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white24),
          ),
          child: Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.handyman_rounded,
                  label: '건설',
                  onPressed: onBuild,
                  highlighted: true,
                ),
              ),
              Expanded(
                child: _ActionButton(
                  icon: Icons.cleaning_services_rounded,
                  label: '청소 60G',
                  onPressed: onClean,
                ),
              ),
              Expanded(
                child: _ActionButton(
                  icon: Icons.bedtime_rounded,
                  label: '하루 마감',
                  onPressed: onFinishDay,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    this.icon,
    this.text,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData? icon;
  final String? text;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xEFFFFFF1),
      shape: const CircleBorder(),
      elevation: 3,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: icon != null
            ? Icon(icon, color: const Color(0xFF304D3C))
            : Text(text!, style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: highlighted
            ? BoxDecoration(
                color: const Color(0xFF4D8A64),
                borderRadius: BorderRadius.circular(14),
              )
            : null,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 23),
            const SizedBox(height: 3),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BuildTile extends StatelessWidget {
  const _BuildTile({
    required this.kind,
    required this.affordable,
    required this.onTap,
  });

  final FacilityKind kind;
  final bool affordable;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: affordable ? const Color(0xFFF1F6EC) : const Color(0xFFF0F0EC),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _facilityColor(kind),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(_facilityIcon(kind), color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(kind.label, style: const TextStyle(fontWeight: FontWeight.w900)),
                    Text(
                      kind.description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${kind.cost} G',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: affordable ? const Color(0xFF315D43) : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static IconData _facilityIcon(FacilityKind kind) => switch (kind) {
        FacilityKind.tent => Icons.change_history_rounded,
        FacilityKind.toilet => Icons.wc_rounded,
        FacilityKind.shop => Icons.storefront_rounded,
        FacilityKind.campfire => Icons.local_fire_department_rounded,
        FacilityKind.cabin => Icons.cabin_rounded,
      };

  static Color _facilityColor(FacilityKind kind) => switch (kind) {
        FacilityKind.tent => const Color(0xFFE2874B),
        FacilityKind.toilet => const Color(0xFF5EA995),
        FacilityKind.shop => const Color(0xFFC58B4F),
        FacilityKind.campfire => const Color(0xFFE66E3C),
        FacilityKind.cabin => const Color(0xFF526F58),
      };
}
