import React from 'react';
import { ProgressType } from "./app-little-board";
import { Button, Spin } from 'antd';
import { ToolBar } from './component/toolbar';
import { StudentController } from './studentController';
export type IStudentAppProps = {
    controller: StudentController;
};
export interface IStudentAppState {
  progress: ProgressType;
  isCommit: boolean;
}
export type pageListItem = {
    label: string;
    key: string;
}

const StudentBottom = (props:{controller:StudentController}) => {
    const {controller} = props;
    return (
      <div className="little-board-student-bottom">
          <ToolBar controller={controller} isAbled={true} isTeacher={false} />
          <Button type="primary" onClick={()=>{
            controller.commitAnswer();
            controller.onCommit();
          }}>提交</Button>
      </div>
    )
}

export class StudentApp extends React.Component<IStudentAppProps, IStudentAppState> {
    constructor(props: IStudentAppProps) {
      super(props);
      this.state = {
        progress: ProgressType.padding,
        isCommit: false
      };
    }
    componentDidMount() {
      this.props.controller.setVDom(this);
      this.props.controller.onMount();
    }
    setProgress = (progress: ProgressType) => {
      this.setState({progress});
    }
    setIsCommit = (isCommit: boolean) => {
      this.setState({isCommit});
    }
    render(): React.ReactNode {
      const { controller } = this.props;
      const { progress, isCommit } = this.state;
      return (
        <div className="little-board-student-container">
          { progress === ProgressType.answering && !isCommit && <StudentBottom controller={controller} /> || null}
          { (progress === ProgressType.padding || progress === ProgressType.developing) && <div className="little-board-student-padding">
              <Spin tip="等待老师出题中..." size="large" >等待老师出题中...</Spin>
          </div> || null}
        </div>
      )
    }
};