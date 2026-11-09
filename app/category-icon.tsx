import {Utensils,TrainFront,BedDouble,ShoppingBag,Ticket,Ellipsis,Coffee,Plane,Car,Fuel,HeartPulse,ShoppingBasket,Gift,Briefcase,Smartphone,Wine} from 'lucide-react';
const icons={food:Utensils,transport:TrainFront,stay:BedDouble,shopping:ShoppingBag,activities:Ticket,other:Ellipsis,coffee:Coffee,plane:Plane,car:Car,fuel:Fuel,health:HeartPulse,groceries:ShoppingBasket,gift:Gift,work:Briefcase,phone:Smartphone,drink:Wine};
export const iconChoices=Object.keys(icons).map(id=>({id,label:id.charAt(0).toUpperCase()+id.slice(1)}));
export function defaultCategoryIcon(category:string){const key=category.toLowerCase();return Object.hasOwn(icons,key)?key:'other';}
export default function CategoryIcon({category,icon,size=24}:{category:string,icon?:string,size?:number}){const key=icon||defaultCategoryIcon(category);const Icon=Object.hasOwn(icons,key)?icons[key as keyof typeof icons]:Ellipsis;return <Icon size={size} strokeWidth={1.7} aria-hidden="true"/>;}
