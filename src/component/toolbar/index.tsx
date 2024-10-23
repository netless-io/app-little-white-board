import React, { createContext, useEffect, useState, type FunctionComponent } from "react";
import { Flex, Button, ConfigProvider } from 'antd';
import { ClickerIcon, DeleteOutlined, FileImageOutlined, TextIcon } from "../icons";
import { EraserButtons } from "../eraserButtons";
import { PencilButtons } from "../pencilButtons";
import { rgbToHex } from "../icons/color";
import type { RoomState, Color, MemberState } from "white-web-sdk";
import type { TeacherController } from "../../teacherController";
import type { StudentController } from "../../studentController";
import { ApplianceNames, EToolsKey } from "../../enum";

export type IToolBarProps = {
    isAbled: boolean;
    isTeacher: boolean;
    controller: TeacherController | StudentController
};
export const AppContext = createContext<{
    toolsKey: EToolsKey;
    setToolsKey:(key:EToolsKey)=>void;
    color: Color;
    setColor:(color:Color)=>void;
  } >({
    toolsKey: EToolsKey.Clicker,
    setToolsKey: () => {},
    color: [],
    setColor: () => {}, 
});
export const ToolBar: FunctionComponent<IToolBarProps> = props => {
    const { isAbled, isTeacher, controller } = props;
    const plugin = controller.appliancePlugin;
    const [toolsKey, setToolsKey] = useState<EToolsKey>(EToolsKey.Image);
    const [color, setColor] = useState<Color>([]);
    useEffect(()=>{
        if(plugin.currentManager?.worker.currentToolsData?.toolsType){
            setToolsKey(plugin.currentManager?.worker.currentToolsData?.toolsType);
        }
        const memberState = plugin.currentManager?.room?.state.memberState as MemberState;
        if (memberState.strokeColor) {
            setColor(memberState.strokeColor);
        }
        if (isTeacher) {
            plugin.displayer?.callbacks.on('onRoomStateChanged', roomStateChangeListener);
        }
        return ()=>{
            plugin.displayer?.callbacks.off('onRoomStateChanged', roomStateChangeListener);
        }
    },[])
    useEffect(()=>{
        const currentTools = plugin.currentManager?.worker.currentToolsData?.toolsType
        if (currentTools !== toolsKey) {
            setApplianceName(toolsKey);
        }
    }, [toolsKey])
    const setApplianceName = (key: EToolsKey) => {
        switch (key) {
            case EToolsKey.Clicker:
                plugin.setMemberState({currentApplianceName: ApplianceNames.clicker})
                break;
            case EToolsKey.Pencil:
                plugin.setMemberState({currentApplianceName: ApplianceNames.pencil})
                break;
            case EToolsKey.Eraser:
                plugin.setMemberState({currentApplianceName: ApplianceNames.eraser})
                break; 
            case EToolsKey.BitMapEraser:
                plugin.setMemberState({currentApplianceName: ApplianceNames.pencilEraser})
                break;
            case EToolsKey.Text:
                plugin.setMemberState({currentApplianceName: ApplianceNames.text})
                break;
            default:
                break;
        }
    }
    const roomStateChangeListener = (state: RoomState) =>{
        if (controller.context.isReplay) {
            return;
        }
        if (!controller.context.getIsWritable()) {
            return;
        }
        const applianceName = state.memberState?.currentApplianceName;
        let curToolsKey;
        switch (applianceName) {
            case ApplianceNames.clicker:
                curToolsKey = EToolsKey.Clicker;
                break;
            case ApplianceNames.pencil:
                curToolsKey = EToolsKey.Pencil;
                break;
            case ApplianceNames.pencilEraser:
                curToolsKey = EToolsKey.BitMapEraser;
                break;
            case ApplianceNames.eraser:
                curToolsKey = EToolsKey.Eraser;
                break;
            case ApplianceNames.text:
                curToolsKey = EToolsKey.Text;
                break;
            default:
                curToolsKey = EToolsKey.Image;
                break;
        }
        if (curToolsKey !== toolsKey) {
            setToolsKey(curToolsKey);
        }
    }
    if (!isAbled) {
        return <div></div>;
    }
    return (
        <ConfigProvider 
            prefixCls="whiteboard"
            theme={{
                token: {
                    colorPrimary: rgbToHex(color[0],color[1],color[2]),
                }
            }}
        >
            <Flex gap="small">
                <AppContext.Provider value={{
                        toolsKey,
                        setToolsKey:(key)=>{
                            setApplianceName(key);
                            setToolsKey(key);
                        },
                        color,
                        setColor
                    }}>
                    <Button
                        type={toolsKey === EToolsKey.Clicker ? 'primary' : 'default'} 
                        icon={<ClickerIcon style={{color: toolsKey === EToolsKey.Clicker ? '#efefef' : 'black' }} />} 
                        value={EToolsKey.Clicker}
                        onClick={() => setToolsKey(EToolsKey.Clicker)}
                    />
                    <PencilButtons plugin={plugin} />
                    <EraserButtons/>
                    <Button 
                        type={toolsKey === EToolsKey.Text ? 'primary' : 'default'} 
                        icon={<TextIcon style={{color: toolsKey === EToolsKey.Text ? '#efefef' : 'black' }}  />} 
                        onClick={()=>setToolsKey(EToolsKey.Text)}
                    />
                    <Button 
                        type={'default'} 
                        icon={<DeleteOutlined/>} 
                        onClick={()=>plugin.cleanCurrentScene()}
                    />
                    <Button 
                        type={'default'} 
                        icon={<FileImageOutlined />} 
                        onClick={ async()=>{
                            await controller.insertImage();
                        }}
                    />
                </AppContext.Provider>
        </Flex>
        </ConfigProvider>    
    );

};