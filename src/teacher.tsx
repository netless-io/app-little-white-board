import React, { useContext } from 'react';
import { TeacherController } from "./teacherController";
import { ProgressType } from "./app-little-board";
import { Button, Flex, Spin, Tabs } from 'antd';
import { ToolBar } from './component/toolbar';
import type { Uid } from '@netless/appliance-plugin/dist/collector';
import { I18n_Teacher, I18nTeacherKey, Language } from './locale';


export type ITeacherAppProps = {
    controller: TeacherController;
    language: Language;
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

export const TeacherContext = React.createContext<{
  language: Language;
  i18n: Record<I18nTeacherKey, string>
}>({
  language: 'zh-CN',
  i18n: I18n_Teacher['zh-CN']
});

const TeacherBottom = (props:{controller:TeacherController, progress:ProgressType, activeKey: string}) => {
    const {controller, progress, activeKey} = props;
    const { i18n } = useContext(TeacherContext);
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
            }}>{i18n['publish']}</Button>
          }
          {
            progress === ProgressType.answering && <Button type="primary" onClick={()=>{
              controller.finishAnswer();
              // todo
            }}>{i18n['finish']}</Button>
          }
          {
            progress === ProgressType.finish && controller.ServiceRenderPageId !== activeKey && <Button type="primary" onClick={()=>{
              controller.publishAnswer(activeKey);
              // todo
            }}>{i18n['show']}</Button>
          }
        </div>
      </div>
    )
}
const TeacherStatisticsBoard= (props:{commits:string[], unCommits:string[]}) => {
  const {commits, unCommits} = props;
  const { i18n } = useContext(TeacherContext);
  return <div className="little-board-teacher-statistics-board">
      <Flex gap="middle">
          <div style={{width: '50%'}}>
            <h3>{i18n['committed']}</h3>
            <Flex gap="small" vertical wrap>
              {
                commits.map((name, index)=>(
                  <div key={index}>{name}</div>
                ))
              }
            </Flex>
          </div>
          <div style={{width: '50%'}}>
            <h3>{i18n['uncommitted']}</h3>
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
      const {controller, language} = this.props;
      const {activeKey, progress, pages, commits, unCommits} = this.state;
      const i18n = I18n_Teacher[language];
      if (progress === ProgressType.padding) {
        return (
          <div className="little-board-student-container">
            <div className="little-board-student-padding">
                <Spin tip={i18n['padding']} size="large" >{i18n['padding']}</Spin>
            </div> 
          </div>
        )
      }
      return (
        <div className="little-board-teacher-container">
          <TeacherContext.Provider value={{ language, i18n }}>
            <Tabs
              style={{pointerEvents:'auto'}}
              onChange={this.onChange}
              activeKey={activeKey}
              type="card"
              items={pages}
            />
            {activeKey === controller.uid && progress === ProgressType.answering && <TeacherStatisticsBoard commits={commits} unCommits={unCommits} />}
            <TeacherBottom controller={controller} progress={progress} activeKey={activeKey} />
          </TeacherContext.Provider>
        </div>
      )
    }
};