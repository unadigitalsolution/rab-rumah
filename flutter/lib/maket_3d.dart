import 'dart:math' as math;
import 'package:flutter/material.dart';

typedef JsonMap = Map<String, dynamic>;

class FullMaketView extends StatefulWidget {
  const FullMaketView({super.key, this.result});
  final JsonMap? result;
  @override State<FullMaketView> createState() => _FullMaketState();
}

class _FullMaketState extends State<FullMaketView> {
  String type = 'Minimalis';
  double yaw = -0.55, pitch = 0.45, zoom = 1;
  bool roofVisible = true;
  final rooms = <_Room>[
    _Room('Kamar 1', 0, 0, 2.8, 3), _Room('Kamar 2', 2.8, 0, 2.8, 3),
    _Room('Ruang Tamu', 0, 3, 3.5, 3), _Room('Dapur', 3.5, 3, 2.1, 2.4),
  ];
  final types = const ['Minimalis','Modern','Limas','Pelana','1 Lantai','2 Lantai'];

  @override Widget build(BuildContext context) {
    final geom = widget.result?['geometry'];
    final l = geom is Map ? ((geom['length'] as num?)?.toDouble() ?? 6) : 6.0;
    final w = geom is Map ? ((geom['width'] as num?)?.toDouble() ?? 6) : 6.0;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Maket 3D & Type Rumah', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 6),
      const Text('Pilih type rumah, putar tampilan, zoom, dan sembunyikan atap untuk melihat interior.'),
      const SizedBox(height: 14),
      SizedBox(height: 120, child: ListView.separated(scrollDirection: Axis.horizontal,itemCount: types.length,separatorBuilder: (_,__)=>const SizedBox(width:8),itemBuilder: (_,i)=>_typeCard(types[i]))),
      const SizedBox(height: 12),
      Card(child: Padding(padding: const EdgeInsets.all(8), child: SizedBox(height: 390, child: GestureDetector(
        onScaleStart: (_) {},
        onScaleUpdate: (d) { setState(() { zoom=(zoom*d.scale).clamp(.65,2.5); yaw += d.focalPointDelta.dx*.008; pitch=(pitch-d.focalPointDelta.dy*.006).clamp(-.7,1.1); }); },
        child: CustomPaint(painter: _House3DPainter(length:l,width:w,yaw:yaw,pitch:pitch,zoom:zoom,roofVisible:roofVisible,type:type,rooms:rooms)),
      )))),
      const SizedBox(height: 10),
      Wrap(spacing:8,runSpacing:8,children:[
        FilterChip(label: Text(roofVisible?'Atap tampil':'Atap disembunyikan'),selected: roofVisible,onSelected:(v)=>setState(()=>roofVisible=v)),
        OutlinedButton.icon(onPressed:()=>setState(()=>yaw=-.55),icon:const Icon(Icons.threed_rotation),label:const Text('Reset 3D')),
        OutlinedButton.icon(onPressed:()=>setState(()=>zoom=(zoom+0.2).clamp(.65,2.5)),icon:const Icon(Icons.zoom_in),label:const Text('Zoom +')),
        OutlinedButton.icon(onPressed:()=>setState(()=>zoom=(zoom-0.2).clamp(.65,2.5)),icon:const Icon(Icons.zoom_out),label:const Text('Zoom −')),
      ]),
      const SizedBox(height: 16),
      Text('Atur ruangan', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 6),
      ...rooms.asMap().entries.map((e)=>Card(child: ListTile(title:Text(e.value.name),subtitle:Text('X ${e.value.x.toStringAsFixed(1)} m • Y ${e.value.y.toStringAsFixed(1)} m'),trailing:Wrap(children:[IconButton(icon:const Icon(Icons.arrow_back),onPressed:()=>setState(()=>e.value.x=math.max(0,e.value.x-.25))),IconButton(icon:const Icon(Icons.arrow_forward),onPressed:()=>setState(()=>e.value.x=math.min(6-e.value.w,e.value.x+.25))),IconButton(icon:const Icon(Icons.arrow_upward),onPressed:()=>setState(()=>e.value.y=math.max(0,e.value.y-.25))),IconButton(icon:const Icon(Icons.arrow_downward),onPressed:()=>setState(()=>e.value.y=math.min(6-e.value.h,e.value.y+.25)))]))),
    ]);
  }

  Widget _typeCard(String t)=>GestureDetector(onTap:()=>setState(()=>type=t),child:AnimatedContainer(duration:const Duration(milliseconds:180),width:150,padding:const EdgeInsets.all(8),decoration:BoxDecoration(borderRadius:BorderRadius.circular(12),border:Border.all(width:type==t?2:1,color:type==t?Theme.of(context).colorScheme.primary:Colors.grey)),child:Column(children:[Expanded(child:CustomPaint(painter:_ThumbPainter(type:t,roof:roofVisible))),Text(t,style:const TextStyle(fontWeight:FontWeight.w600))])));
}

class _Room { _Room(this.name,this.x,this.y,this.w,this.h); String name; double x,y,w,h; }

class _ThumbPainter extends CustomPainter { final String type; final bool roof; _ThumbPainter({required this.type,required this.roof}); @override void paint(Canvas c,Size s){final p=Paint()..style=PaintingStyle.fill..color=Colors.grey.shade300; final b=Rect.fromLTWH(s.width*.18,s.height*.38,s.width*.64,s.height*.45);c.drawRect(b,p);p.color=Colors.grey.shade500;if(roof){final path=Path()..moveTo(s.width*.12,s.height*.4)..lineTo(s.width*.5,s.height*.12)..lineTo(s.width*.88,s.height*.4)..close();c.drawPath(path,p);}p.color=Colors.grey.shade700;c.drawRect(Rect.fromLTWH(s.width*.44,s.height*.55,s.width*.12,s.height*.28),p); }@override bool shouldRepaint(covariant _ThumbPainter o)=>o.type!=type||o.roof!=roof;}

class _House3DPainter extends CustomPainter {
  final double length,width,yaw,pitch,zoom; final bool roofVisible; final String type; final List<_Room> rooms;
  _House3DPainter({required this.length,required this.width,required this.yaw,required this.pitch,required this.zoom,required this.roofVisible,required this.type,required this.rooms});
  Offset project(double x,double y,double z,Size s){final cy=math.cos(yaw),sy=math.sin(yaw),cp=math.cos(pitch),sp=math.sin(pitch);final X=x*cy-y*sy,Y=x*sy+y*cy;final yy=Y*cp-z*sp;final zz=Y*sp+z*cp;final scale=math.min(s.width,s.height)*.065*zoom;return Offset(s.width/2+(X)*scale,s.height*.63-(yy)*scale-zz*scale);}
  @override void paint(Canvas c,Size s){final h=3.0;final p=Paint()..style=PaintingStyle.fill;final pts=[project(0,0,0,s),project(length,0,0,s),project(length,width,0,s),project(0,width,0,s),project(0,0,h,s),project(length,0,h,s),project(length,width,h,s),project(0,width,h,s)];p.color=Colors.grey.shade300;c.drawPath(Path()..addPolygon([pts[0],pts[1],pts[5],pts[4]],true),p);p.color=Colors.grey.shade200;c.drawPath(Path()..addPolygon([pts[1],pts[2],pts[6],pts[5]],true),p);p.color=Colors.grey.shade400;c.drawPath(Path()..addPolygon([pts[4],pts[5],pts[6],pts[7]],true),p);final edge=Paint()..style=PaintingStyle.stroke..strokeWidth=1.6..color=Colors.black87;for(final pair in [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])c.drawLine(pts[pair[0]],pts[pair[1]],edge);
    if(roofVisible){final z=h+1.25;final r1=project(0,0,z,s),r2=project(length,0,z,s),r3=project(length,width,z,s),r4=project(0,width,z,s);p.color=type=='Limas'?Colors.brown.shade400:Colors.brown.shade300;c.drawPath(Path()..addPolygon([pts[4],pts[5],r2,r1],true),p);c.drawPath(Path()..addPolygon([pts[5],pts[6],r3,r2],true),p);c.drawPath(Path()..addPolygon([pts[6],pts[7],r4,r3],true),p);c.drawPath(Path()..addPolygon([pts[7],pts[4],r1,r4],true),p);}
    if(!roofVisible){final ip=Paint()..style=PaintingStyle.stroke..strokeWidth=1..color=Colors.black54;for(final r in rooms){final a=project(r.x,r.y,.03,s),b=project(r.x+r.w,r.y,.03,s),d=project(r.x+r.w,r.y+r.h,.03,s),e=project(r.x,r.y+r.h,.03,s);c.drawPath(Path()..addPolygon([a,b,d,e],true),ip);}}
    final door=Paint()..color=Colors.brown.shade700;c.drawRect(Rect.fromCenter(center:project(length*.5,-.02,1.05,s),width:18*zoom,height:34*zoom),door);final win=Paint()..color=Colors.lightBlue.shade200;for(final x in [length*.25,length*.75])c.drawRect(Rect.fromCenter(center:project(x,-.03,1.65,s),width:22*zoom,height:16*zoom),win);
  }
  @override bool shouldRepaint(covariant _House3DPainter o)=>true;
}
