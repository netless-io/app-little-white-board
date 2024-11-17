import React, { useContext } from 'react';
import { ProgressType } from "./app-little-board";
import { Button, Spin } from 'antd';
import { ToolBar } from './component/toolbar';
import { StudentController } from './studentController';
import { I18n_Student, I18nStudentKey, Language } from './locale';

export type IStudentAppProps = {
    controller: StudentController;
    language: Language;
};
export interface IStudentAppState {
  progress: ProgressType;
  isCommit: boolean;
}
export type pageListItem = {
    label: string;
    key: string;
}

export const StudentContext = React.createContext<{
  language: Language;
  i18n: Record<I18nStudentKey, string>
}>({
  language: 'zh-CN',
  i18n: I18n_Student['zh-CN']
});

const StudentBottom = (props:{controller:StudentController}) => {
    const {controller} = props;
    const { i18n } = useContext(StudentContext);
    return (
      <div className="little-board-student-bottom">
          <ToolBar controller={controller} isAbled={true} isTeacher={false} />
          <Button type="primary" onClick={()=>{
            controller.commitAnswer();
            controller.onCommit();
          }}>{i18n['commit']}</Button>
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
      const { controller, language } = this.props;
      const { progress, isCommit } = this.state;
      const i18n = I18n_Student[language];
      return (
        <div className="little-board-student-container">
          <StudentContext.Provider value={{ language, i18n }}>
            { progress === ProgressType.answering && !isCommit && <StudentBottom controller={controller} /> || null}
            { (progress === ProgressType.padding || progress === ProgressType.developing) && <div className="little-board-student-padding">
                <Spin tip={i18n['padding']} size="large" >{i18n['padding']}</Spin>
            </div> || null}
          </StudentContext.Provider>
        </div>
      )
    }
};