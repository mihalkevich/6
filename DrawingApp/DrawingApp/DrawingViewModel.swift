import SwiftUI
import PencilKit

class DrawingViewModel: ObservableObject {
    @Published var canvasView = PKCanvasView()
    @Published var toolPicker = PKToolPicker()
    @Published var selectedColor: Color = .black
    @Published var selectedTool: DrawingTool = .pen
    @Published var lineWidth: CGFloat = 5.0

    enum DrawingTool: String, CaseIterable {
        case pen = "Ручка"
        case pencil = "Аловак"
        case marker = "Маркер"
        case eraser = "Гумка"

        var icon: String {
            switch self {
            case .pen: return "pencil.tip"
            case .pencil: return "pencil"
            case .marker: return "highlighter"
            case .eraser: return "eraser"
            }
        }
    }

    init() {
        setupCanvas()
    }

    func setupCanvas() {
        canvasView.drawingPolicy = .anyInput
        canvasView.backgroundColor = .white
        updateTool()
    }

    func updateTool() {
        let uiColor = UIColor(selectedColor)
        switch selectedTool {
        case .pen:
            canvasView.tool = PKInkingTool(.pen, color: uiColor, width: lineWidth)
        case .pencil:
            canvasView.tool = PKInkingTool(.pencil, color: uiColor, width: lineWidth)
        case .marker:
            canvasView.tool = PKInkingTool(.marker, color: uiColor, width: lineWidth * 3)
        case .eraser:
            canvasView.tool = PKEraserTool(.bitmap)
        }
    }

    func updateToolColor() {
        updateTool()
    }

    func selectTool(_ tool: DrawingTool) {
        selectedTool = tool
        updateTool()
    }

    func clearCanvas() {
        canvasView.drawing = PKDrawing()
    }

    func undo() {
        canvasView.undoManager?.undo()
    }

    func redo() {
        canvasView.undoManager?.redo()
    }
}
