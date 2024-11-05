import React from 'react';
import { TeacherController } from "./teacherController";
import { ProgressType } from "./app-little-board";
import { Button, Flex, Spin, Tabs } from 'antd';
import { ToolBar } from './component/toolbar';
import type { Uid } from '@netless/appliance-plugin/dist/collector';
export type ITeacherAppProps = {
    controller: TeacherController;
};

export interface ITeacherAppState {
  progress: ProgressType;
  pages: pageListItem[];
  activeKey: Uid;
  commits: string[];
  unCommits: string[];
}

export type pageListItem = {
    label: string;
    key: string;
}

const TeacherBottom = (props:{controller:TeacherController, progress:ProgressType, activeKey: string}) => {
    const {controller, progress, activeKey} = props;
    let isAbled = false;
    switch (progress) {
      case ProgressType.developing:
        isAbled = true;
        break;
      case ProgressType.answering:
        if (controller.uid !== activeKey) {
          isAbled = true;
        }
        break;
      case ProgressType.announcing:
        isAbled = true;
        break;
    }
    return (
      <div className="little-board-teacher-bottom">
        <ToolBar controller={controller} isAbled={isAbled} isTeacher={true} />
        <div>
          {
            progress === ProgressType.developing && <Button type="primary" onClick={()=>{
              controller.publishQuestion();
              controller.onPublishQuestion();
            }}>发布</Button>
          }
          {
            progress === ProgressType.answering && <Button type="primary" onClick={()=>{
              controller.finishAnswer();
              // todo
            }}>结束</Button>
          }
          {
            progress === ProgressType.finish && controller.ServiceRenderPageId !== activeKey && <Button type="primary" onClick={()=>{
              controller.publishAnswer(activeKey);
              // todo
            }}>全班展示</Button>
          }
        </div>
      </div>
    )
}
const TeacherStatisticsBoard= (props:{commits:string[], unCommits:string[]}) => {
  const {commits, unCommits} = props;
  return <div className="little-board-teacher-statistics-board">
      <Flex gap="middle">
          <div style={{width: '50%'}}>
            <h3>已提交</h3>
            <Flex gap="small" vertical wrap>
              {
                commits.map((name, index)=>(
                  <div key={index}>{name}</div>
                ))
              }
            </Flex>
          </div>
          <div style={{width: '50%'}}>
            <h3>未提交</h3>
            <Flex gap="small" vertical wrap>
              {
                unCommits.map((name, index)=>(
                  <div key={index}>{name}</div>
                ))
              }
            </Flex>
          </div>
      </Flex>
  </div>
}
export class TeacherApp extends React.Component<ITeacherAppProps, ITeacherAppState> {
    constructor(props: ITeacherAppProps) {
      super(props);
      this.state = {
        progress: ProgressType.padding,
        pages: [],
        activeKey: '',
        commits: [],
        unCommits: []
      };
    } 
    componentDidMount() {
      this.props.controller.setVDom(this);
      this.props.controller.onMount();
    }
    setRenderPageId = (renderPageId: string) => {
      this.setState({activeKey: renderPageId});
    }
    setProgress = (progress: ProgressType) => {
      this.setState({progress});
    }
    setPages = (pages: pageListItem[]) => {
      this.setState({pages});
    }
    setCommitList = (commits:string[])=>{
      this.setState({commits});
    };
    setUnCommitList = (unCommits:string[]) =>{
      this.setState({unCommits});
    }
    private onChange = (activeKey: string) => {
      this.setState({activeKey});
      this.props.controller.switchPage(activeKey);
    }
    render(){
      const {controller} = this.props;
      const {activeKey, progress, pages, commits, unCommits} = this.state;
      if (progress === ProgressType.padding) {
        return (
          <div className="little-board-student-container">
            <div className="little-board-student-padding">
                <Spin tip="Loading..." size="large" >Loading...</Spin>
            </div> 
          </div>
        )
      }
      return (
        <div className="little-board-teacher-container">
          <Tabs
            style={{pointerEvents:'auto'}}
            onChange={this.onChange}
            activeKey={activeKey}
            type="card"
            items={pages}
          />
          {activeKey === controller.uid && progress === ProgressType.answering && <TeacherStatisticsBoard commits={commits} unCommits={unCommits} />}
          <TeacherBottom controller={controller} progress={progress} activeKey={activeKey} />
        </div>
      )
    }
};