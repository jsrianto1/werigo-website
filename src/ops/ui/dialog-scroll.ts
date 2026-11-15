let locks=0;
let previous='';

// Native dialogs trap focus. Share the scroll lock when one dialog opens another.
export function lockDialogScroll(){
  if(locks++===0){previous=document.body.style.overflow;document.body.style.overflow='hidden';}
  let released=false;
  return ()=>{if(released)return;released=true;if(--locks===0)document.body.style.overflow=previous;};
}
