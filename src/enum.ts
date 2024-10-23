export enum EToolsKey {
    /** 铅笔绘制工具 */
    Pencil = 1,
    /** 橡皮擦工具 */
    Eraser = 2,
    /** 局部橡皮擦 */
    PencilEraser = 3,
    /** 局部位图橡皮擦 */
    BitMapEraser = 4,
    /** 选择工具 */
    Selector = 5,
    /** 点击互动工具 */
    Clicker = 6,
    /** 箭头工具 */
    Arrow = 7,
    /** 抓手工具 */
    Hand = 8,
    /** 激光铅笔绘制工具 */
    LaserPen = 9,
    /** 文字工具 */
    Text = 10,
    /** 直线工具 */
    Straight = 11,
    /** 矩形工具 */
    Rectangle = 12,
    /** 圆形工具 */
    Ellipse = 13,
    /** 星形工具 */
    Star = 14,
    /** 三角形工具 */
    Triangle = 15,
    /** 菱形工具 */
    Rhombus = 16,
    /** 多边形工具 */
    Polygon = 17,
    /** 聊天泡泡框 */
    SpeechBalloon = 18,
    /** 图片 */
    Image = 19
}
export enum EStrokeType {
    Normal = "Normal",
    Stroke = "Stroke",
    Dotted = "Dotted",
    LongDotted = "LongDotted"
}
export enum ApplianceNames {
    /**
     * 选择工具
     */
    selector = "selector",
    /**
     * 互动工具（无默认行为，可供 plugin 自定义）
     */
    clicker = "clicker",
    /**
     * 激光笔
     */
    laserPointer = "laserPointer",
    /**
     * 铅笔工具
     */
    pencil = "pencil",
    /**
     * 矩形工具
     */
    rectangle = "rectangle",
    /**
     * 圆形工具
     */
    ellipse = "ellipse",
    /**
     * 图形工具
     */
    shape = "shape",
    /**
     * 橡皮工具
     */
    eraser = "eraser",
    /**
     * 橡皮工具（用来擦除铅笔笔迹的局部）
     */
    pencilEraser = "pencilEraser",
    /**
     * 文字工具
     */
    text = "text",
    /**
     * 直线工具
     */
    straight = "straight",
    /**
     * 箭头工具
     */
    arrow = "arrow",
    /**
     * 抓手工具
     */
    hand = "hand",
    /**
     * 激光笔
     */
    laserPen = "laserPen"
}