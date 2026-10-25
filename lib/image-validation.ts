export function imageExtension(bytes:Uint8Array,mime:string){
 const b=bytes;const png=b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
 const jpg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
 const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 if(mime==='image/png'&&png)return 'png';if(mime==='image/jpeg'&&jpg)return 'jpg';if(mime==='image/webp'&&webp)return 'webp';
 throw new Error('The file content must match a JPG, PNG, or WebP image.');
}
