import 'package:flutter_test/flutter_test.dart';
import '../lib/rab_engine.dart';

void main() {
  test('calculates geometry, materials, labor and total', () {
    final project = <String, dynamic>{
      'building': {
        'length': 6,
        'width': 6,
        'floors': 1,
        'wallHeight': 3,
        'roofPitch': 30,
        'overhang': .5,
        'bathrooms': 1,
        'terraceArea': 5,
        'carportArea': 12,
        'openings': {
          'doors': 4,
          'windows': 5,
          'doorWidth': .9,
          'doorHeight': 2.1,
          'windowWidth': 1.2,
          'windowHeight': 1.2,
        },
      },
      'spec': {'wall': 'lightbrick', 'floor': 'tile', 'roofCover': 'genteng', 'ceiling': 'gypsum'},
      'waste': {'material': 5, 'tile': 7, 'brick': 5, 'paint': 5, 'roof': 5},
      'materialWaste': <String, dynamic>{},
      'coefficients': <String, dynamic>{},
      'laborPriceOverrides': <String, dynamic>{},
      'priceOverrides': <String, dynamic>{},
      'extras': {'equipment': 5, 'overhead': 5, 'contingency': 5, 'transport': 0, 'profit': 0},
    };
    final result = RabEngine.calculate(project);
    final geometry = result['geometry'] as Map<String, dynamic>;
    final summary = result['summary'] as Map<String, dynamic>;
    expect(geometry['area'], 36);
    expect(geometry['floorArea'], 36);
    expect((result['items'] as List).isNotEmpty, isTrue);
    expect(summary['material'], greaterThan(0));
    expect(summary['labor'], greaterThan(0));
    expect(summary['total'], greaterThan(summary['direct']));
    expect(summary['costPerM2'], greaterThan(0));
  });

  test('project price overrides are respected', () {
    final project = <String, dynamic>{
      'building': {'length': 6, 'width': 6, 'floors': 1, 'wallHeight': 3, 'bathrooms': 1, 'openings': {'doors': 1, 'windows': 2}},
      'spec': {'wall': 'lightbrick', 'floor': 'tile', 'roofCover': 'genteng', 'ceiling': 'gypsum'},
      'waste': {'material': 0, 'tile': 0, 'brick': 0, 'paint': 0, 'roof': 0},
      'priceOverrides': {'cement': 100000},
      'laborPriceOverrides': <String, dynamic>{},
      'coefficients': <String, dynamic>{},
      'materialWaste': <String, dynamic>{},
      'extras': {'equipment': 0, 'overhead': 0, 'contingency': 0, 'transport': 0, 'profit': 0},
    };
    final result = RabEngine.calculate(project);
    final cement = (result['items'] as List).where((x) => x['materialId'] == 'cement').toList();
    expect(cement, isNotEmpty);
    expect(cement.first['unitPrice'], 100000);
  });
}
