(function(root){
"use strict";

const ID="east-tennessee-1861",PIXELS_PER_TILE=50;
const clone=value=>JSON.parse(JSON.stringify(value));
const room=(id,name,rect,style={})=>({id,name,rects:[rect],revealMode:"always",tokensAlways:true,cutaway:"front",...style});
const prop=(id,t,x,y,extra={})=>({id,t,x,y,...extra});

/*
 * These are deliberately ordinary Verso levels: rooms, doors, stairs, and
 * reusable props. The scene-state modules still own NPC placement, reveals,
 * case state, bridge state, timers, and outcomes. A GM can edit any of this
 * geometry through the existing Layout Editor and the edited level is stored
 * in the East Tennessee session rather than replacing the source package.
 */
const FINCHS_NEST=Object.freeze({
  exterior:Object.freeze({
    key:"finchs-nest:exterior",sceneId:"finchs-nest",floor:"exterior",scale:PIXELS_PER_TILE,
    label:"Finch's Nest · Exterior & Stable",
    level:{schemaVersion:3,name:"Finch's Nest · Exterior & Stable",bg:"#2B332C",rooms:[
      room("et-fn-ext-road","Road",{x:0,y:0,w:24,h:3},{sub:"road and front approach",floorA:"#777064",floorB:"#6A6256",wall:"#5A5146",wallHeight:0,structure:"platform",read:"The road and front approach run along the north edge of the inn.",dm:"The front gate opens toward the road. The yard and stable sit behind the inn."}),
      room("et-fn-ext-porch","Porch",{x:4,y:3,w:10,h:2},{sub:"front entrance",floorA:"#6D533B",floorB:"#604932",wall:"#4D382A",read:"A raised porch gives onto the common room and the road.",dm:"The porch is the ordinary public entrance."}),
      room("et-fn-ext-inn","Inn",{x:3,y:5,w:12,h:4},{sub:"main building",floorA:"#6A5038",floorB:"#5D4633",wall:"#4B372A",read:"The inn's front wall and windows face the road; service access turns toward the yard.",dm:"The inn is a timber structure. The stable roof lies below the east upper window."}),
      room("et-fn-ext-stable","Stable",{x:0,y:9,w:11,h:7},{sub:"stalls and loft",floorA:"#695139",floorB:"#5C4632",wall:"#493527",read:"A timber stable holds stalls, tack, feed, water, and a ladder to the loft.",dm:"Will's chestnut mare occupies a stall while he is present. A stablehand normally sleeps near the loft."}),
      room("et-fn-ext-yard","Yard",{x:12,y:9,w:12,h:7},{sub:"service yard",floorA:"#625944",floorB:"#574F3D",wall:"#4A4436",wallHeight:0,structure:"platform",read:"The service yard holds the rear gate, cart, water, feed, and ordinary clutter.",dm:"The rear yard is open enough for a quiet approach but not hidden from every window."}),
      room("et-fn-ext-roof","Stable roof",{x:5,y:8,w:6,h:2},{sub:"lower roof",floorA:"#514A3E",floorB:"#474137",wall:"#3B362E",wallHeight:0,elevation:1,structure:"platform",read:"A low stable roof runs beneath the east upper window.",dm:"The roof is an advisory approach, not an automatic route or legality ruling."}),
    ],doors:[
      {id:"et-fn-ext-front-gate",x:8,y:2,dir:"v",type:"open",len:1},
      {id:"et-fn-ext-porch-door",x:8,y:4,dir:"v",type:"open",len:1},
      {id:"et-fn-ext-stable-door",x:11,y:11,dir:"v",type:"open",len:1},
      {id:"et-fn-ext-yard-gate",x:23,y:12,dir:"v",type:"open",len:1},
    ],stairs:[
      {id:"et-fn-ext-ladder",x:9,y:8,w:1,h:2,dir:"n",from:0,to:1,style:"wood"},
    ],props:[
      prop("et-fn-ext-road-fence","fence",1,2,{footprint:{w:6,h:.5}}),
      prop("et-fn-ext-road-fence-east","fence",10,2,{footprint:{w:5,h:.5}}),
      prop("et-fn-ext-porch-lamp","lamp",8.5,3.3,{label:"Porch lamp",playerLabel:"Porch lamp",focus:true}),
      prop("et-fn-ext-inn-rug","rug",6.2,5.5,{label:"Front runner",playerLabel:"Worn runner",scale:1.2}),
      prop("et-fn-ext-stall-rail-a","fence",1,10,{label:"Stall rail",playerLabel:"Stall rail",footprint:{w:8,h:.5}}),
      prop("et-fn-ext-stall-rail-b","fence",1,12,{label:"Stall rail",playerLabel:"Stall rail",footprint:{w:8,h:.5}}),
      prop("et-fn-ext-horse","horse",3,10.1,{label:"Will's chestnut mare",playerLabel:"A horse in the stall",playerInspect:"A saddled chestnut mare shifts quietly in the straw."}),
      prop("et-fn-ext-hay","crate",7.8,13.1,{label:"Hay and feed",playerLabel:"Feed bin"}),
      prop("et-fn-ext-stable-barrel","barrel",9.2,14.3,{label:"Water barrel",playerLabel:"Water barrel"}),
      prop("et-fn-ext-yard-cart","cart",14,12.2,{label:"Service cart",playerLabel:"Service cart",scale:1.15}),
      prop("et-fn-ext-yard-crates","crate",17,14,{label:"Stacked crates",playerLabel:"Crates",scale:1.2}),
      prop("et-fn-ext-yard-barrel","barrel",19,14.4,{label:"Feed barrel",playerLabel:"Barrel"}),
      prop("et-fn-ext-yard-fence","fence",18,9,{label:"Rear fence",playerLabel:"Rear fence",footprint:{w:5,h:.5}}),
      prop("et-fn-ext-roof-ladder","fence",9,8,{label:"Stable-roof ladder",playerLabel:"Ladder",footprint:{w:1,h:2}}),
    ],roster:[],encounterEffects:[]},
    partyStart:{x:7,y:3.5},
  }),
  ground:Object.freeze({
    key:"finchs-nest:ground",sceneId:"finchs-nest",floor:"ground",scale:PIXELS_PER_TILE,
    label:"Finch's Nest · Ground Floor",
    level:{schemaVersion:3,name:"Finch's Nest · Ground Floor",bg:"#292B27",rooms:[
      room("et-fn-ground-common","Common Room",{x:0,y:0,w:13,h:9},{sub:"hearth and public room",floorA:"#6B513A",floorB:"#5C4633",wall:"#4A3629",read:"Tables, benches, hearth, serving counter, front entrance, and the visible stair fill the common room.",dm:"The stair is visible from much of the active common room. Staff and guests may move through this space by ordinary GM ruling."}),
      room("et-fn-ground-service","Service",{x:13,y:0,w:7,h:9},{sub:"kitchen and bar",floorA:"#5E4A36",floorB:"#51402F",wall:"#433327",read:"The kitchen and service area holds the bar, storage, rear door, and work surfaces.",dm:"The cook or housekeeper normally works here. The rear door opens toward the service yard."}),
      room("et-fn-ground-stair","Stairs",{x:8,y:9,w:5,h:5},{sub:"screened stair foot",floorA:"#5A4635",floorB:"#4E3C30",wall:"#403128",read:"A screened stair foot leads up to the guest corridor.",dm:"The stair is the clean connection to the upper floor. Its visibility and noise remain GM rulings."}),
      room("et-fn-ground-staff","Staff Room",{x:13,y:9,w:5,h:5},{sub:"staff sleeping room",floorA:"#554333",floorB:"#49382D",wall:"#3D2E26",read:"A small room behind the service area contains staff beds.",dm:"The innkeeper and cook or housekeeper normally sleep downstairs after closing."}),
      room("et-fn-ground-yard-door","Rear Door",{x:18,y:0,w:4,h:5},{sub:"service exit",floorA:"#625943",floorB:"#554D3C",wall:"#484133",wallHeight:0,structure:"platform",read:"A short service passage reaches the rear yard.",dm:"The rear door is ordinary and visible from the kitchen side."}),
    ],doors:[
      {id:"et-fn-ground-front",x:6,y:0,dir:"h",type:"open",len:1},
      {id:"et-fn-ground-bar-opening",x:13,y:4,dir:"v",type:"open",len:2},
      {id:"et-fn-ground-service-door",x:20,y:2,dir:"v",type:"open",len:1},
      {id:"et-fn-ground-staff-door",x:13,y:11,dir:"v",type:"door",len:1},
    ],stairs:[
      {id:"et-fn-ground-upper-stair",x:9,y:8,w:2,h:4,dir:"s",from:0,to:1,style:"wood"},
    ],props:[
      prop("et-fn-ground-hearth","pillar",4,2.2,{label:"Hearth",playerLabel:"Hearth",scale:1.2}),
      prop("et-fn-ground-rug","rug",3.2,4.4,{label:"Common-room rug",playerLabel:"Worn common-room rug",scale:1.6}),
      prop("et-fn-ground-table-a","table",2,6,{label:"Common-room table",playerLabel:"Table",scale:1.15}),
      prop("et-fn-ground-table-b","table",7,6.3,{label:"Common-room table",playerLabel:"Table",scale:1.15}),
      prop("et-fn-ground-chair-a","chair",1.5,7.2,{playerLabel:"Chair"}),prop("et-fn-ground-chair-b","chair",4.5,7.2,{playerLabel:"Chair"}),
      prop("et-fn-ground-chair-c","chair",6.5,7.6,{playerLabel:"Chair"}),prop("et-fn-ground-chair-d","chair",9.5,7.6,{playerLabel:"Chair"}),
      prop("et-fn-ground-bar","bar",14,1.2,{label:"Service bar",playerLabel:"Service bar",playerInspect:"Shelves and bottles run behind the counter.",footprint:{w:4,h:1}}),
      prop("et-fn-ground-shelf","shelf",17,1.2,{label:"Bar shelves",playerLabel:"Shelves"}),
      prop("et-fn-ground-stove","crate",15.5,5.5,{label:"Kitchen stove",playerLabel:"Kitchen stove",scale:1.25}),
      prop("et-fn-ground-cart","cart",18,6.2,{label:"Service cart",playerLabel:"Service cart"}),
      prop("et-fn-ground-stair-screen","fence",8,8,{label:"Stair screen",playerLabel:"Wooden screen",footprint:{w:4,h:.5}}),
      prop("et-fn-ground-staff-bed-a","bed",13.6,10,{label:"Staff bed",playerLabel:"Staff bed"}),
      prop("et-fn-ground-staff-bed-b","bed",16,12,{label:"Staff bed",playerLabel:"Staff bed"}),
      prop("et-fn-ground-staff-chest","chest",15,10.5,{label:"Staff chest",playerLabel:"Small chest"}),
      prop("et-fn-ground-lamp-a","wallsconce",1,1,{label:"Wall lamp",playerLabel:"Wall lamp"}),
      prop("et-fn-ground-lamp-b","wallsconce",12.2,1,{label:"Wall lamp",playerLabel:"Wall lamp"}),
    ],roster:[],encounterEffects:[]},
    partyStart:{x:5.5,y:4.5},
  }),
  upper:Object.freeze({
    key:"finchs-nest:upper",sceneId:"finchs-nest",floor:"upper",scale:PIXELS_PER_TILE,
    label:"Finch's Nest · Upper Floor",
    level:{schemaVersion:3,name:"Finch's Nest · Upper Floor",bg:"#222722",rooms:[
      room("et-fn-upper-corridor","Upper Corridor",{x:0,y:5,w:20,h:4},{sub:"stair landing",floorA:"#5B4837",floorB:"#4E3D31",wall:"#403128",read:"A narrow corridor connects the stair to the guest rooms.",dm:"One stair or landing board creaks; the sound and consequences remain advisory GM rulings."}),
      room("et-fn-upper-other","Guest Room",{x:0,y:0,w:6,h:5},{sub:"occupied room",floorA:"#5D4938",floorB:"#503E31",wall:"#403027",read:"An occupied guest room sits at the west end of the upper floor.",dm:"The guest is an ordinary occupant; visibility and sleep are GM rulings."}),
      room("et-fn-upper-letter","Letter Guest",{x:6,y:0,w:7,h:5},{sub:"occupied room",floorA:"#624B38",floorB:"#543F30",wall:"#413026",read:"The civilian gentleman's occupied room lies across from the corridor.",dm:"The room is adjacent enough to matter for noise and witness rulings."}),
      room("et-fn-upper-will","Will's Room",{x:13,y:0,w:7,h:5},{sub:"east guest room",floorA:"#664A37",floorB:"#573D2E",wall:"#402D24",read:"Will's room contains a bed, pillow, washstand, chair, pegs, and an east window.",dm:"The dispatch case is beneath Will's pillow during the retiring and deep-night phases unless the GM changes its location."}),
      room("et-fn-upper-spare","Spare Room",{x:0,y:9,w:6,h:4},{sub:"unoccupied room",floorA:"#514437",floorB:"#46392F",wall:"#3A2D26",read:"A spare room stands nearer the stairs.",dm:"No occupant is assumed."}),
      room("et-fn-upper-linen","Linen Closet",{x:6,y:9,w:4,h:4},{sub:"storage",floorA:"#534434",floorB:"#46382C",wall:"#392C24",read:"A narrow linen and storage closet opens off the corridor.",dm:"The closet is cramped and ordinary."}),
      room("et-fn-upper-east-window","East Window",{x:13,y:9,w:7,h:4},{sub:"stable-roof side",floorA:"#4F4A3E",floorB:"#454137",wall:"#37332D",wallHeight:0,elevation:1,structure:"platform",read:"The east side overlooks the lower stable roof.",dm:"The relation to the stable roof is visible here, but no route is automatically safe or legal."}),
    ],doors:[
      {id:"et-fn-upper-west-guest",x:6,y:6,dir:"v",type:"door",len:1},
      {id:"et-fn-upper-letter-door",x:13,y:6,dir:"v",type:"door",len:1},
      {id:"et-fn-upper-will-door",x:16,y:5,dir:"h",type:"door",len:1},
      {id:"et-fn-upper-spare-door",x:6,y:7,dir:"v",type:"door",len:1},
      {id:"et-fn-upper-linen-door",x:10,y:7,dir:"v",type:"door",len:1},
    ],stairs:[
      {id:"et-fn-upper-stair",x:9,y:7,w:2,h:3,dir:"n",from:1,to:0,style:"wood"},
    ],props:[
      prop("et-fn-upper-other-bed","bed",1.2,1.2,{label:"Occupied guest bed",playerLabel:"Guest bed"}),
      prop("et-fn-upper-letter-bed","bed",7.2,1.2,{label:"Civilian gentleman's bed",playerLabel:"Guest bed"}),
      prop("et-fn-upper-will-bed","bed",14.2,1.2,{label:"Will's bed",playerLabel:"Will's bed",focus:true}),
      prop("et-fn-upper-will-chest","chest",17.3,2.8,{label:"Travel chest",playerLabel:"Travel chest"}),
      prop("et-fn-upper-will-lamp","lamp",18.2,1.1,{label:"East window lamp",playerLabel:"Lamp"}),
      prop("et-fn-upper-letter-wash","barrel",11,3.1,{label:"Washstand",playerLabel:"Washstand"}),
      prop("et-fn-upper-other-wash","barrel",4.5,3.1,{label:"Washstand",playerLabel:"Washstand"}),
      prop("et-fn-upper-corridor-rug","rug",6.5,6,{label:"Corridor runner",playerLabel:"Corridor runner",scale:1.4}),
      prop("et-fn-upper-spare-bed","bed",1.2,10,{label:"Spare bed",playerLabel:"Spare bed"}),
      prop("et-fn-upper-linen-shelf","shelf",7,10,{label:"Linen shelves",playerLabel:"Linen shelves"}),
      prop("et-fn-upper-window","mirror",18,10,{label:"East window",playerLabel:"East window"}),
      prop("et-fn-upper-lamp-a","wallsconce",2,6,{label:"Corridor lamp",playerLabel:"Corridor lamp"}),
      prop("et-fn-upper-lamp-b","wallsconce",17,6,{label:"Corridor lamp",playerLabel:"Corridor lamp"}),
    ],roster:[],encounterEffects:[]},
    partyStart:{x:10,y:6.5},
  }),
});

const LICK_CREEK=Object.freeze({
  key:"lick-creek",sceneId:"lick-creek",floor:"main",scale:PIXELS_PER_TILE,label:"Lick Creek · Railroad Bridge",
  level:{schemaVersion:3,name:"Lick Creek · Railroad Bridge",bg:"#26332D",rooms:[
    room("et-lc-ridge","Ridge",{x:0,y:0,w:9,h:6},{sub:"observation ridge",floorA:"#43523D",floorB:"#394735",wall:"#33412F",wallHeight:0,structure:"platform",read:"Wooded rising ground overlooks the bridge from the northwest.",dm:"A suitable observation point is here. Plainly visible guard count and posture remain GM-controlled reveals."}),
    room("et-lc-woods","Woods",{x:0,y:6,w:7,h:8},{sub:"horse-hiding woods",floorA:"#344A37",floorB:"#2E4031",wall:"#29392B",wallHeight:0,structure:"platform",read:"Dense woods offer concealment away from the exposed floodplain.",dm:"The woods are an approach option, not an automatic concealment or route."}),
    room("et-lc-west","West Approach",{x:7,y:5,w:5,h:5},{sub:"west railroad approach",floorA:"#5E5546",floorB:"#514A3D",wall:"#443E34",wallHeight:0,structure:"platform",read:"The west embankment rises toward the bridge and a modest guard post.",dm:"The west post and approach are visible from the ridge and bridge space."}),
    room("et-lc-bridge","Bridge Deck",{x:9,y:4,w:14,h:5},{sub:"railroad bridge",floorA:"#6B5038",floorB:"#5E4632",wall:"#4A3628",wallHeight:0,elevation:2,structure:"platform",read:"The timber railroad bridge crosses the broad shallow creek.",dm:"The deck is elevated above the open space beneath it. Fire and damage remain GM state, not geometry automation."}),
    room("et-lc-east","East Approach",{x:23,y:5,w:5,h:5},{sub:"east railroad approach",floorA:"#5E5546",floorB:"#514A3D",wall:"#443E34",wallHeight:0,structure:"platform",read:"The east embankment runs toward the road and the work camp.",dm:"The east post and approach are visible from the bridge space."}),
    room("et-lc-under","Beneath Bridge",{x:9,y:9,w:14,h:7},{sub:"under-bridge work space",floorA:"#49666A",floorB:"#3D585D",wall:"#334C4F",wallHeight:0,structure:"platform",read:"A broad, muddy space lies beneath the bridge, with timber piers, rocks, and room to move around the supports.",dm:"This is the main actionable space under the bridge. The VTT records positions; it does not decide cover, adjacency, line of sight, or legality."}),
    room("et-lc-south","South Bank",{x:9,y:16,w:14,h:4},{sub:"south bank",floorA:"#52604A",floorB:"#46533F",wall:"#394534",wallHeight:0,structure:"platform",read:"The south bank and creek margins lead toward the country road.",dm:"Possible withdrawal routes remain GM-adjudicated."}),
    room("et-lc-camp","Work Camp",{x:24,y:10,w:8,h:9},{sub:"railroad work camp",floorA:"#665845",floorB:"#574B3C",wall:"#473C30",wallHeight:0,structure:"platform",read:"The southeast work camp holds tools, fuel, a wagon, lamps, and sleeping areas.",dm:"Raines, Isaac, Daniel Cole, and worker groups begin here. Worker response remains GM-controlled."}),
    room("et-lc-road","Country Road",{x:28,y:5,w:4,h:5},{sub:"southeast road",floorA:"#6A6554",floorB:"#5C5749",wall:"#4A473B",wallHeight:0,structure:"platform",read:"A country road runs southeast from the bridge and work camp.",dm:"A messenger or escaping party may use this direction only by GM ruling."}),
  ],doors:[
    {id:"et-lc-west-to-bridge",x:9,y:7,dir:"h",type:"open",len:2},
    {id:"et-lc-east-to-bridge",x:22,y:7,dir:"h",type:"open",len:2},
    {id:"et-lc-under-west",x:9,y:11,dir:"v",type:"open",len:2},
    {id:"et-lc-under-east",x:23,y:11,dir:"v",type:"open",len:2},
    {id:"et-lc-camp-road",x:28,y:9,dir:"h",type:"open",len:2},
  ],stairs:[
    {id:"et-lc-west-embankment",x:8,y:7,w:1,h:2,dir:"e",from:0,to:1,style:"stone"},
    {id:"et-lc-east-embankment",x:22,y:7,w:1,h:2,dir:"w",from:0,to:1,style:"stone"},
  ],props:[
    prop("et-lc-ridge-tree-a","tree",0.8,1,{label:"Ridge tree",playerLabel:"Tree",footprint:{w:1.4,h:1.4}}),
    prop("et-lc-ridge-tree-b","tree",4,2,{label:"Ridge tree",playerLabel:"Tree",footprint:{w:1.4,h:1.4}}),
    prop("et-lc-woods-tree-a","tree",1,8,{label:"Woodland tree",playerLabel:"Tree",footprint:{w:1.4,h:1.4}}),
    prop("et-lc-woods-tree-b","tree",4,11,{label:"Woodland tree",playerLabel:"Tree",footprint:{w:1.4,h:1.4}}),
    prop("et-lc-west-track","track",7,6.7,{label:"West rail line",playerLabel:"Rail line",footprint:{w:7,h:1}}),
    prop("et-lc-east-track","track",21,6.7,{label:"East rail line",playerLabel:"Rail line",footprint:{w:7,h:1}}),
    prop("et-lc-bridge-deck","bridge",10,5.2,{label:"Timber bridge deck",playerLabel:"Timber deck",footprint:{w:12,h:2.6}}),
    prop("et-lc-pier-a","pillar",11,8.8,{label:"Bridge pier",playerLabel:"Timber pier",terrain:"cover",footprint:{w:1.2,h:1.2}}),
    prop("et-lc-pier-b","pillar",15.5,8.8,{label:"Bridge pier",playerLabel:"Timber pier",terrain:"cover",footprint:{w:1.2,h:1.2}}),
    prop("et-lc-pier-c","pillar",20,8.8,{label:"Bridge pier",playerLabel:"Timber pier",terrain:"cover",footprint:{w:1.2,h:1.2}}),
    prop("et-lc-creek-a","water",10,12,{label:"Shallow creek",playerLabel:"Shallow creek",footprint:{w:12,h:2.5}}),
    prop("et-lc-creek-b","water",10,15,{label:"Shallow creek",playerLabel:"Shallow creek",footprint:{w:12,h:1.2}}),
    prop("et-lc-under-rubble-a","rubble",12,10.5,{label:"Muddy rocks",playerLabel:"Muddy rocks",terrain:"difficult",footprint:{w:2,h:1.2}}),
    prop("et-lc-under-rubble-b","rubble",18,13.7,{label:"Maintenance timbers",playerLabel:"Maintenance timbers",terrain:"difficult",footprint:{w:2.5,h:1}}),
    prop("et-lc-camp-shed","bridge",25,11,{label:"Work shed",playerLabel:"Work shed",footprint:{w:4,h:2.5}}),
    prop("et-lc-camp-wagon","cart",29,13,{label:"Work wagon",playerLabel:"Work wagon",scale:1.2}),
    prop("et-lc-camp-crates","crate",26,15,{label:"Dry scrap and tools",playerLabel:"Crates and tools",scale:1.2}),
    prop("et-lc-camp-barrel","barrel",28,16,{label:"Fuel barrel",playerLabel:"Barrel"}),
    prop("et-lc-camp-lamp","lamp",30,11,{label:"Camp lamp",playerLabel:"Camp lamp",focus:true}),
    prop("et-lc-camp-fence","fence",24,18,{label:"Camp fence",playerLabel:"Camp fence",footprint:{w:7,h:.5}}),
  ],roster:[],encounterEffects:[
    {id:"et-lc-fire-zone",name:"Bridge fire",terrain:"hazard",shape:"rect",w:4,h:3,duration:0},
    {id:"et-lc-mud",name:"Muddy ground",terrain:"difficult",shape:"rect",w:3,h:2,duration:0},
  ]},
  partyStart:{x:4,y:4},
});

const LEVELS=Object.freeze({
  "finchs-nest:exterior":FINCHS_NEST.exterior,
  "finchs-nest:ground":FINCHS_NEST.ground,
  "finchs-nest:upper":FINCHS_NEST.upper,
  "lick-creek":LICK_CREEK,
});
root.EastTennesseeScenes=Object.freeze({CAMPAIGN_ID:ID,PIXELS_PER_TILE,FINCHS_NEST,LICK_CREEK,LEVELS,clone});
if(typeof module!=="undefined"&&module.exports)module.exports=root.EastTennesseeScenes;
})(typeof globalThis!=="undefined"?globalThis:this);
