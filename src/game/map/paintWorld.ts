import Phaser from "phaser";
import type { MapDefinition } from "../types/dataDefinitions";

/** Deterministic painted terrain; collision and object data remain authoritative. */
export function paintWorld(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, definition: MapDefinition): void {
  const key = `landscape-${definition.id}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, map.widthInPixels, map.heightInPixels)!;
    const c = texture.context;
    // All painting is cached once per map.
    c.imageSmoothingEnabled = false;
    let seed = [...definition.id].reduce((n, ch) => Math.imul(n, 31) + ch.charCodeAt(0), 17);
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const rect = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.floor(x), Math.floor(y), w, h); };
    const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
    const town = definition.type === "town" || definition.id.endsWith("-hub");
    const arid = /desert|sun|dune/.test(definition.id);
    const stone = definition.type === "dungeon" || definition.type === "tower" || /cave|mine|crypt|sewer|spire|sanctum|tomb|archive/.test(definition.id);
    const marsh = /marsh|bog|fen/.test(definition.id);
    const grass = stone ? ["#343e40", "#394446", "#40494a", "#303b3d"] : arid ? ["#9b8450", "#a58c57", "#ad945e", "#947c49"] : marsh ? ["#344c3d", "#3e5841", "#496044", "#304a3d"] : ["#3c542d", "#405a30", "#466034", "#4b6336"];
    for (let y = 0; y < map.heightInPixels; y += 4) for (let x = 0; x < map.widthInPixels; x += 4) {
      rect(x, y, 4, 4, grass[Math.floor(random() * grass.length)]!);
      if (random() < .18) rect(x, y, 1, 2, stone ? "#58605b" : "#6e7b42");
    }
    const objects = map.getObjectLayer("Objects")?.objects ?? [];
    const spawn = objects.find(o => o.type === "spawn");
    const cx = spawn?.x ?? map.widthInPixels / 2, cy = spawn?.y ?? map.heightInPixels / 2;
    const paths = objects.filter(o => ["portal", "npc", "spawn"].includes(o.type ?? ""));
    // Worn paths lead to actual destinations, never invented exits.
    for (const o of paths) {
      const x = (o.x ?? cx) + (o.type === "portal" ? (o.width ?? 0) / 2 : 0), y = (o.y ?? cy) + (o.type === "portal" ? (o.height ?? 0) / 2 : 0);
      c.lineCap = "round";
      for (const [width, color] of [[town ? 38 : 25, stone ? "#252e30" : "#5f603a"], [town ? 30 : 17, stone ? "#555954" : "#998151"]] as const) {
        c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, cy); c.lineTo(x, y); c.stroke();
      }
    }
    // Small gravel, grass blades and flowers break up repeated tiles.
    const pathPixels = c.getImageData(0, 0, map.widthInPixels, map.heightInPixels).data;
    for (let i = 0; i < map.widthInPixels * map.heightInPixels / 65; i++) {
      const x = Math.floor(random() * map.widthInPixels), y = Math.floor(random() * map.heightInPixels);
      const red = pathPixels[(y * map.widthInPixels + x) * 4]!;
      if (red > 100) { rect(x, y, 2 + Math.floor(random() * 3), 1, random() < .5 ? "#b19b6e" : "#786849"); }
      else if (!stone && random() < .35) {
        rect(x, y, 1, 4, "#283e26"); rect(x + 1, y, 1, 3, "#788748");
        if (random() < .15) rect(x, y - 1, 2, 2, random() < .5 ? "#d4b967" : "#c7c3a1");
      }
    }
    const collision = map.getLayer("Collision")?.data ?? [];
    const seen = new Set<string>();
    for (let row = 0; row < map.height; row++) for (let col = 0; col < map.width; col++) {
      if ((collision[row]?.[col]?.index ?? -1) < 0 || seen.has(`${col},${row}`)) continue;
      const edge = col === 0 || row === 0 || col === map.width - 1 || row === map.height - 1;
      let w = 1, h = 1;
      if (!edge && town) {
        while (col + w < map.width - 1 && (collision[row]?.[col + w]?.index ?? -1) >= 0) w++;
        while (row + h < map.height - 1 && Array.from({length:w}, (_, i) => (collision[row + h]?.[col + i]?.index ?? -1) >= 0).every(Boolean)) h++;
      }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) seen.add(`${col+i},${row+j}`);
      const x = col * map.tileWidth, y = row * map.tileHeight, bw = w * map.tileWidth, bh = h * map.tileHeight;
      if (town && !edge && w > 1) {
        rect(x+4,y+6,bw,bh,"#283326"); rect(x,y,bw,bh,"#6d654f");
        for(let by=y;by<y+bh;by+=9) for(let bx=x;bx<x+bw;bx+=17) { rect(bx+1,by+1,15,7,random()<.5?"#8d8061":"#7f755c"); }
        rect(x+4,y+3,bw-8,bh-25,"#342e2b");
        for(let ry=y+5;ry<y+bh-28;ry+=7) for(let rx=x+5;rx<x+bw-7;rx+=11) { const lower = ry > y + (bh - 25) / 2;
          rect(rx,ry,Math.min(10,x+bw-5-rx),6,lower ? (random()<.5?"#594235":"#684b38") : (random()<.5?"#896044":"#9b6d49"));
          rect(rx,ry,Math.min(9,x+bw-5-rx),1,lower?"#8d6847":"#bb8756");
          if(random()<.5) rect(rx+2,ry+2,3,1,lower?"#77523c":"#ad7a50"); }
        rect(x+3,y+Math.floor((bh-25)/2),bw-6,3,"#c29a65");
        rect(x+3,y+4,3,bh-32,"#bd945d"); rect(x+bw-6,y+4,3,bh-32,"#4a382d");
        // Chimney, timber framing and planted window boxes.
        rect(x+bw-28,y+8,15,24,"#574e40"); rect(x+bw-30,y+7,19,5,"#aaa083"); rect(x+bw-26,y+8,11,2,"#302d27");
        rect(x+1,y+bh-29,bw-2,4,"#c09a60");
        rect(x+bw/2-9,y+bh-24,18,24,"#332c25"); rect(x+bw/2-6,y+bh-21,12,21,"#5a422b");
        for(const wx of [x+12,x+bw-24]) { rect(wx,y+bh-21,12,13,"#302f2a"); rect(wx+2,y+bh-19,8,9,"#c29a50"); rect(wx+5,y+bh-19,2,9,"#665135");
          rect(wx-2,y+bh-7,16,4,"#493e2d");
          for(let f=0;f<6;f++) { rect(wx-1+f*3,y+bh-9,2,3,"#577045"); if(f%2===0) rect(wx-1+f*3,y+bh-10,2,2,"#c8aa65"); }
        }
        for(const tx of [x+3,x+bw-7]) rect(tx,y+bh-25,4,25,"#51412e");
      } else if (stone || arid) {
        ellipse(x+17,y+24,17,10,"#252e2a"); ellipse(x+15,y+15,15,13,stone?"#5b625b":"#887447");
        rect(x+7,y+5,16,4,stone?"#85877a":"#b39a66"); rect(x+5,y+10,3,10,"#737a67");
      } else {
        ellipse(x+17,y+26,18,9,"#263825"); rect(x+13,y+17,7,13,"#675035");
        for(let k=0;k<18;k++) {
          const tx=x+4+random()*24, ty=y+2+random()*20;
          ellipse(tx,ty,7,5,["#233e2c","#305033","#416137","#59703b"][Math.floor(random()*4)]!);
          rect(tx-2,ty-3,4,2,"#768044");
        }
      }
    }
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  scene.add.image(0, 0, key).setOrigin(0).setDepth(1);
}
