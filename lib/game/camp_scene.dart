import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:three_js/three_js.dart' as three;

import 'game_controller.dart';
import 'models.dart';

class CampScene extends StatefulWidget {
  const CampScene({required this.controller, super.key});

  final CampGameController controller;

  @override
  State<CampScene> createState() => _CampSceneState();
}

class _CampSceneState extends State<CampScene> {
  late final three.ThreeJS _threeJs;
  final List<three.Object3D> _campers = [];
  final List<three.Object3D> _flames = [];
  int _syncedFacilityCount = 0;
  bool _sceneReady = false;
  double _elapsed = 0;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onGameChanged);
    _threeJs = three.ThreeJS(
      onSetupComplete: () {
        if (mounted) {
          setState(() {});
        }
      },
      setup: _setupScene,
      loadingWidget: const ColoredBox(
        color: Color(0xFFBFE0E2),
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onGameChanged);
    _threeJs.dispose();
    three.loading.clear();
    super.dispose();
  }

  void _onGameChanged() {
    if (!_sceneReady) return;
    _syncFacilities();
    _syncCampers();
    _syncSky();
  }

  Future<void> _setupScene() async {
    _threeJs.camera = three.PerspectiveCamera(
      34,
      _threeJs.width / _threeJs.height,
      0.1,
      120,
    );
    _threeJs.camera.position.setValues(14, 18, 21);
    _threeJs.scene = three.Scene();
    _threeJs.scene.background = three.Color.fromHex32(0xBFE0E2);
    _threeJs.camera.lookAt(three.Vector3(0, 0, 0));

    _threeJs.scene.add(three.HemisphereLight(0xF4F6E8, 0x4F6842, 0.85));
    final sun = three.DirectionalLight(0xFFF1C4, 0.75);
    sun.position.setValues(8, 16, 10);
    _threeJs.scene.add(sun);

    _createGround();
    _createScenery();
    _sceneReady = true;
    _syncFacilities();
    _syncCampers();

    _threeJs.addAnimationEvent((dt) {
      _elapsed += dt;
      for (var index = 0; index < _campers.length; index++) {
        final camper = _campers[index];
        final radius = 2.4 + (index % 3) * 0.65;
        final phase = _elapsed * (0.22 + index * 0.015) + index * 1.7;
        camper.position.x = math.cos(phase) * radius;
        camper.position.z = 1.2 + math.sin(phase) * radius * 0.62;
        camper.rotation.y = -phase;
      }
      for (var index = 0; index < _flames.length; index++) {
        final pulse = 0.88 + math.sin(_elapsed * 8 + index) * 0.14;
        _flames[index].scale.setValues(pulse, 0.92 + pulse * 0.18, pulse);
        _flames[index].rotation.y += dt * 0.8;
      }
    });
  }

  void _createGround() {
    final ground = _mesh(
      three.BoxGeometry(19, 0.55, 18),
      0x77A957,
    );
    ground.position.y = -0.3;
    _threeJs.scene.add(ground);

    final path = _mesh(
      three.BoxGeometry(3.0, 0.12, 16.5),
      0xD7C39B,
    );
    path.position.setValues(0, 0.04, 0.3);
    _threeJs.scene.add(path);

    for (final z in [-5.5, -1.5, 2.5, 6.2]) {
      final branch = _mesh(
        three.BoxGeometry(10.5, 0.1, 1.0),
        0xCDB88E,
      );
      branch.position.setValues(0, 0.08, z);
      _threeJs.scene.add(branch);
    }
  }

  void _createScenery() {
    const treePositions = <(double, double, double)>[
      (-8.0, -7.2, 1.1),
      (-7.6, -3.8, 0.9),
      (-8.2, 1.0, 1.2),
      (-7.8, 6.7, 1.0),
      (7.8, -7.0, 1.0),
      (8.1, -3.8, 1.2),
      (7.7, 1.5, 0.9),
      (8.0, 6.8, 1.15),
      (-5.3, 7.5, 0.9),
      (5.5, 7.6, 1.0),
    ];
    for (final position in treePositions) {
      _threeJs.scene.add(
        _tree(position.$1, position.$2, position.$3),
      );
    }

    for (final position in const [(-6.8, -5.8), (6.8, 5.8), (5.8, -6.8)]) {
      final rock = _mesh(three.DodecahedronGeometry(0.48, 0), 0x8B9387);
      rock.position.setValues(position.$1, 0.28, position.$2);
      rock.scale.setValues(1.3, 0.7, 1.0);
      _threeJs.scene.add(rock);
    }
  }

  void _syncFacilities() {
    final facilities = widget.controller.facilities;
    while (_syncedFacilityCount < facilities.length) {
      final facility = facilities[_syncedFacilityCount];
      final object = _facilityObject(facility.kind);
      object.position.setValues(facility.gridX, 0, facility.gridZ);
      object.rotation.y = (_syncedFacilityCount % 2 == 0 ? -0.12 : 0.12);
      _threeJs.scene.add(object);
      _syncedFacilityCount += 1;
    }
  }

  void _syncCampers() {
    while (_campers.length < widget.controller.guests) {
      final camper = _camper(_campers.length);
      _campers.add(camper);
      _threeJs.scene.add(camper);
    }
    for (var index = 0; index < _campers.length; index++) {
      _campers[index].visible = index < widget.controller.guests;
    }
  }

  void _syncSky() {
    _threeJs.scene.background = three.Color.fromHex32(
      widget.controller.isNight ? 0x233653 : 0xBFE0E2,
    );
  }

  three.Object3D _facilityObject(FacilityKind kind) => switch (kind) {
        FacilityKind.tent => _tent(),
        FacilityKind.toilet => _toilet(),
        FacilityKind.shop => _shop(),
        FacilityKind.campfire => _campfire(),
        FacilityKind.cabin => _cabin(),
      };

  three.Group _tent() {
    final group = three.Group();
    final base = _mesh(three.BoxGeometry(2.7, 0.14, 2.4), 0x6E8554);
    base.position.y = 0.08;
    group.add(base);

    final canvas = _mesh(three.ConeGeometry(1.55, 2.3, 4), 0xE48B4C);
    canvas.position.y = 1.2;
    canvas.rotation.y = math.pi / 4;
    group.add(canvas);

    final door = _mesh(three.ConeGeometry(0.48, 0.82, 3), 0x5B463D);
    door.position.setValues(0, 0.55, 1.28);
    door.rotation.x = math.pi / 2;
    group.add(door);
    return group;
  }

  three.Group _toilet() {
    final group = three.Group();
    final body = _mesh(three.BoxGeometry(1.8, 2.4, 1.7), 0x6BB6A1);
    body.position.y = 1.2;
    group.add(body);
    final roof = _mesh(three.BoxGeometry(2.1, 0.22, 2.0), 0x315A52);
    roof.position.y = 2.45;
    group.add(roof);
    final door = _mesh(three.BoxGeometry(0.85, 1.55, 0.08), 0xECF1D6);
    door.position.setValues(0, 0.82, 0.9);
    group.add(door);
    return group;
  }

  three.Group _shop() {
    final group = three.Group();
    final body = _mesh(three.BoxGeometry(2.8, 1.8, 2.2), 0xD7A864);
    body.position.y = 0.9;
    group.add(body);
    final roof = _mesh(three.ConeGeometry(2.1, 1.25, 4), 0x7D4D3B);
    roof.position.y = 2.15;
    roof.rotation.y = math.pi / 4;
    group.add(roof);
    final awning = _mesh(three.BoxGeometry(2.4, 0.16, 0.75), 0xF3D78B);
    awning.position.setValues(0, 1.45, 1.35);
    awning.rotation.x = -0.18;
    group.add(awning);
    return group;
  }

  three.Group _campfire() {
    final group = three.Group();
    for (var index = 0; index < 2; index++) {
      final log = _mesh(three.CylinderGeometry(0.13, 0.13, 1.7, 8), 0x765039);
      log.position.y = 0.2;
      log.rotation.z = math.pi / 2;
      log.rotation.y = index == 0 ? math.pi / 4 : -math.pi / 4;
      group.add(log);
    }
    final flame = _mesh(three.ConeGeometry(0.48, 1.35, 7), 0xFF8A32, basic: true);
    flame.position.y = 0.9;
    _flames.add(flame);
    group.add(flame);
    final glow = three.PointLight(0xFF9E45, 0.8);
    glow.position.y = 1.5;
    group.add(glow);
    return group;
  }

  three.Group _cabin() {
    final group = three.Group();
    final deck = _mesh(three.BoxGeometry(3.3, 0.2, 3.0), 0x94704D);
    deck.position.y = 0.12;
    group.add(deck);
    final body = _mesh(three.BoxGeometry(2.8, 2.0, 2.5), 0xEEE0B6);
    body.position.y = 1.2;
    group.add(body);
    final roof = _mesh(three.ConeGeometry(2.15, 1.45, 4), 0x47614C);
    roof.position.y = 2.75;
    roof.rotation.y = math.pi / 4;
    group.add(roof);
    final door = _mesh(three.BoxGeometry(0.85, 1.45, 0.08), 0x8A5D3E);
    door.position.setValues(0, 0.92, 1.29);
    group.add(door);
    return group;
  }

  three.Group _tree(double x, double z, double scale) {
    final group = three.Group();
    group.position.setValues(x, 0, z);
    group.scale.setValues(scale, scale, scale);
    final trunk = _mesh(three.CylinderGeometry(0.22, 0.3, 2.0, 7), 0x765039);
    trunk.position.y = 1;
    group.add(trunk);
    final crown = _mesh(three.ConeGeometry(1.15, 2.8, 7), 0x315E42);
    crown.position.y = 3.0;
    group.add(crown);
    final crownTop = _mesh(three.ConeGeometry(0.82, 2.1, 7), 0x3D754F);
    crownTop.position.y = 4.25;
    group.add(crownTop);
    return group;
  }

  three.Group _camper(int index) {
    const shirts = [0xE36B5B, 0x527FC1, 0xE8B84C, 0x8E6EB2];
    final group = three.Group();
    final body = _mesh(
      three.CylinderGeometry(0.25, 0.32, 0.85, 8),
      shirts[index % shirts.length],
    );
    body.position.y = 0.72;
    group.add(body);
    final head = _mesh(three.SphereGeometry(0.29, 10, 8), 0xF0C7A0);
    head.position.y = 1.38;
    group.add(head);
    final hat = _mesh(three.CylinderGeometry(0.36, 0.36, 0.12, 10), 0xEEE2B7);
    hat.position.y = 1.68;
    group.add(hat);
    return group;
  }

  three.Mesh _mesh(
    three.BufferGeometry geometry,
    int color, {
    bool basic = false,
  }) {
    final material = basic
        ? three.MeshBasicMaterial({three.MaterialProperty.color: color})
        : three.MeshLambertMaterial({three.MaterialProperty.color: color});
    return three.Mesh(geometry, material);
  }

  @override
  Widget build(BuildContext context) => _threeJs.build();
}
