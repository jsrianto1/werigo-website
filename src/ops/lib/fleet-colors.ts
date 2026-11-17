// Asset keys and labels verified against wedison-bali.com/en/motor/{model}/.
export const FLEET_COLORS:Record<string,string[]>={edpower:['red-glossy','white-glossy','navy-glossy','grey-glossy','black-glossy'],athena:['black-glossy','white-glossy','yellow-glossy','green-glossy','pink-glossy'],victory:['black-matte','black-glossy','white-glossy','red-glossy','silver-glossy'],bees:['red-glossy','white-glossy','black-glossy','grey-glossy']};
const aliases:Record<string,string>={merah:'red',putih:'white',hitam:'black',hijau:'green',kuning:'yellow',abu:'grey','abu-abu':'grey',gray:'grey',biru:'navy',blue:'navy',pink:'pink',silver:'silver',navy:'navy'};
const defaults:Record<string,string>={edpower:'red-glossy',athena:'white-glossy',victory:'silver-glossy',bees:'grey-glossy'};
export function fleetColorImage(model:string,color?:string,catalog=false){
 const choices=FLEET_COLORS[model];if(!choices)return null;let key=String(color||'').trim().toLowerCase().replace(/\s+/g,'-');
 if(!key&&catalog)key=defaults[model];if(choices.includes(key))return '/ops-assets/fleet/colors/'+model+'-'+key+(model==='athena'?'-v20261117':'')+'.webp';
 const finish=key.endsWith('-matte')?'matte':'glossy';key=key.replace(/-(matte|glossy)$/,'');key=aliases[key]||key;if(model==='victory'&&key==='grey')key='silver';key+='-'+finish;
 return choices.includes(key)?'/ops-assets/fleet/colors/'+model+'-'+key+(model==='athena'?'-v20261117':'')+'.webp':null;
}
