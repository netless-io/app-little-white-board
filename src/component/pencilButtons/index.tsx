 
import {useContext, useEffect, useState} from 'react';
import { DottedPencilIcon, DottedPencilLongIcon, NormPencilIcon, StrokePencilIcon } from '../icons';
import { Popover, Button, Flex, Slider } from 'antd';
import type { AppliancePluginInstance, MemberState } from "@netless/appliance-plugin";
import type { Color, FloatBarOptions } from 'white-web-sdk';
import React from 'react';
import { AppContext } from '../toolbar';
import { rgbToRgba } from "../icons/color";
import { EStrokeType, EToolsKey } from '../../enum';

const PencilIcons = (props:{strokeType: EStrokeType, color: string}) => {
    const {strokeType, color} = props;
    switch (strokeType) {
        case EStrokeType.Stroke:
            return <StrokePencilIcon style={{color}} />
        case EStrokeType.Dotted:
            return <DottedPencilIcon style={{color}} />
        case EStrokeType.LongDotted:
            return <DottedPencilLongIcon style={{color}} />
        default:
            return <NormPencilIcon style={{color}}/>
    }
}

const PencilTools = (props: {
    strokeType: EStrokeType;
    color: Color;
    opacity: number;
    floatBarOptions?: FloatBarOptions;
    setMemberState: (state: Partial<MemberState>) => void;
}) => {
    const {setMemberState, strokeType, color, opacity, floatBarOptions} = props;
    return (
            <Flex gap="small" vertical style={{maxWidth:'200px'}} >
                <Flex gap="small">
                    <Button type={strokeType === EStrokeType.Stroke ? 'primary' : 'default'} icon={<PencilIcons color={strokeType === EStrokeType.Stroke ? '#efefef' : 'black'} strokeType={EStrokeType.Stroke} />} onClick={()=>{
                        setMemberState({strokeType:EStrokeType.Stroke});
                    }}/>
                    <Button type={strokeType === EStrokeType.Normal ? 'primary' : 'default'} icon={<PencilIcons color={strokeType === EStrokeType.Normal ? '#efefef' : 'black'} strokeType={EStrokeType.Normal} />} onClick={()=>{
                        setMemberState({strokeType:EStrokeType.Normal});
                    }}/>
                    <Button type={strokeType === EStrokeType.Dotted ? 'primary' : 'default'} icon={<PencilIcons color={strokeType === EStrokeType.Dotted ? '#efefef' : 'black'} strokeType={EStrokeType.Dotted} />} onClick={()=>{
                        setMemberState({strokeType:EStrokeType.Dotted});
                    }}/>
                    <Button type={strokeType === EStrokeType.LongDotted ? 'primary' : 'default'} icon={<PencilIcons color={strokeType === EStrokeType.LongDotted ? '#efefef' : 'black'} strokeType={EStrokeType.LongDotted} />} onClick={()=>{
                        setMemberState({strokeType:EStrokeType.LongDotted});
                    }}/>
                </Flex>
                {
                    floatBarOptions?.colors && <Flex wrap gap="small">
                        {
                            floatBarOptions.colors.map((c: readonly number[]) => {
                                const [r,g,b] = c;
                                const color = `rgb(${r},${g},${b})`
                                return <Button 
                                    key={color}
                                    size={'small'}
                                    // type={'primary'}
                                    shape="circle"
                                    style={{backgroundColor: color}}
                                    onClick={()=>{
                                        setMemberState({strokeColor:[r,g,b]});
                                    }}
                                />
                            })
                        }
                    </Flex>
                }
                <Slider
                    defaultValue = {opacity}
                    min={0}
                    max={1}
                    step={0.1}
                    onChangeComplete={(value)=>{
                        setMemberState({strokeOpacity: value});
                    }}
                    styles={{
                        rail: {
                            background: `linear-gradient(to right, transparent, ${rgbToRgba(color[0],color[1],color[2], 1)})`
                        },
                        track: {
                            background: 'transparent',
                        },
                        tracks: {
                            background: 'transparent',
                        },
                        handle: {
                            color: rgbToRgba(color[0],color[1],color[2], opacity),
                            background: 'transparent',
                        }
                    }}
                />
            </Flex>
    )
}

export const PencilButtons = (props:{plugin: AppliancePluginInstance}) => {
    const {plugin} = props;
    const {toolsKey, setToolsKey, color, setColor} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const [curMemberState, setCurMemberState] = useState<Partial<MemberState>>();
    const [strokeType, setStrokeType] = useState(EStrokeType.Stroke);
    const [opacity, setOpactiy] = useState<number>(1);

    useEffect(()=>{
        const memberState = plugin.currentManager?.room?.state.memberState as MemberState;
        if (memberState?.strokeType) {
            setStrokeType(memberState.strokeType);
        }
        if (memberState?.strokeOpacity) {
            setOpactiy(memberState.strokeOpacity);
        }
    },[])

    useEffect(()=>{
        if (curMemberState?.strokeType) {
            setStrokeType(curMemberState.strokeType);
        }
        if (curMemberState?.strokeOpacity) {
            setOpactiy(curMemberState.strokeOpacity);
        }
    },[curMemberState])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
    };
    const setMemberState = (state: Partial<MemberState>) => {
        if (state?.strokeType) {
            setStrokeType(state.strokeType);
        }
        if (state?.strokeColor) {
            setColor(state.strokeColor)
        }
        plugin.setMemberState(state);
        setCurMemberState(state);
        setToolsKey(EToolsKey.Pencil);
    }
    return (
        <Popover
            content={<PencilTools
                floatBarOptions={(plugin.currentManager?.room as any)?.floatBarOptions as FloatBarOptions}
                strokeType={strokeType} 
                color={ color }
                opacity={opacity}
                setMemberState={setMemberState} />}
            placement="top"
            open={open}
            mouseEnterDelay={0.5}
            onOpenChange={handleOpenChange}
        >
            <Button 
                type={ toolsKey === EToolsKey.Pencil ?  'primary' : 'default'} 
                icon={ <PencilIcons strokeType={strokeType} color={ toolsKey === EToolsKey.Pencil ? '#efefef' : 'black'} />}
                onClick={() => {
                    if (toolsKey !== EToolsKey.Pencil) {
                        setToolsKey(EToolsKey.Pencil);
                    }
                }}
            />
        </Popover>
    )
}