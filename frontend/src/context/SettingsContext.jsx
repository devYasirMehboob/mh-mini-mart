import {createContext,useCallback,useEffect,useMemo,useState} from "react";
import {getPublicSettings} from "../api/settingsApi";
import {configureCurrency} from "../utils/calculateSaleTotals";
const SettingsContext=createContext(null);
export function SettingsProvider({children}){
 const[settings,setSettings]=useState(null);const[isLoading,setIsLoading]=useState(true);
 const refreshSettings=useCallback(async()=>{const value=await getPublicSettings();setSettings(value);configureCurrency(value.localization);return value;},[]);
 useEffect(()=>{let active=true;getPublicSettings().then(value=>{if(active){setSettings(value);configureCurrency(value.localization);}}).catch(()=>{}).finally(()=>{if(active)setIsLoading(false)});return()=>{active=false};},[]);
 const value=useMemo(()=>({settings,isLoading,refreshSettings,replaceSettings:(next)=>{setSettings(next);configureCurrency(next?.localization);}}),[settings,isLoading,refreshSettings]);
 return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export default SettingsContext;
