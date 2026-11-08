import {Utensils,TrainFront,BedDouble,ShoppingBag,Ticket,Ellipsis} from 'lucide-react';
const icons={Food:Utensils,Transport:TrainFront,Stay:BedDouble,Shopping:ShoppingBag,Activities:Ticket,Other:Ellipsis};
export default function CategoryIcon({category,size=24}:{category:string,size?:number}){const Icon=Object.hasOwn(icons,category)?icons[category as keyof typeof icons]:Ellipsis;return <Icon size={size} strokeWidth={1.65} aria-hidden="true"/>;}
