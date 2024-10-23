 
import {useContext, useEffect, useState} from 'react';
import { ErasersIcon, PencilEraserIcon } from '../icons';
import { Popover, Button, Flex, theme } from 'antd';
import React from 'react';
import { AppContext } from '../toolbar';
import { EToolsKey } from '../../enum';
const { useToken } = theme;

const EraserToolsKeys = [EToolsKey.Eraser, EToolsKey.BitMapEraser]

const EraserIcons = (props:{toolsKey: EToolsKey, color: string}) => {
    const {color, toolsKey} = props;
    switch (toolsKey) {
        case EToolsKey.BitMapEraser:
            return <PencilEraserIcon style={{color}} />
        default:
            return <ErasersIcon style={{color}}/>
    }
}

const EraserTools = (props: {
    setEraser: (key: EToolsKey) => void;
}) => {
    const { token } = useToken();
    const {setEraser} = props;
    const {toolsKey} = useContext(AppContext);
    return <div >
            <Flex>
                <Button
                    type="text"
                    icon={ <EraserIcons toolsKey={EToolsKey.Eraser} color={toolsKey === EToolsKey.Eraser ? token.colorPrimary : 'black'} />}
                    onClick={() => setEraser(EToolsKey.Eraser)}
                />
                <Button
                    type="text"
                    icon={ <EraserIcons toolsKey={EToolsKey.BitMapEraser} color={toolsKey === EToolsKey.BitMapEraser ? token.colorPrimary : 'black'} />}
                    onClick={() => setEraser(EToolsKey.BitMapEraser)}
                />
            </Flex>
        </div>
}

export const EraserButtons = () => {
    const {toolsKey, setToolsKey} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const [curEraser, setCurEraser] = useState(EToolsKey.Eraser);
    useEffect(()=>{
        if (toolsKey === EToolsKey.BitMapEraser) {
            setCurEraser(EToolsKey.BitMapEraser);
        }
    },[])
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
    };
    const setEraser = (key: EToolsKey) => {
        setCurEraser(key);
        setToolsKey(key);
    }
    return (
        <Popover
            content={<EraserTools setEraser={setEraser} />}
            placement="top"
            open={open}
            onOpenChange={handleOpenChange}
        >
            <Button 
                type={EraserToolsKeys.includes(toolsKey) ?  'primary' : 'default'} 
                icon={<EraserIcons toolsKey={curEraser} color={ EraserToolsKeys.includes(toolsKey) ? '#efefef' : 'black' } />}
                onClick={() => {
                    if (!EraserToolsKeys.includes(toolsKey)) {
                        setToolsKey(curEraser); 
                    }
                }}
            />
        </Popover>
    )
}