import SwiftUI
import PencilKit

struct ContentView: View {
    @StateObject private var drawingViewModel = DrawingViewModel()
    @State private var showColorPicker = false
    @State private var showSaveAlert = false
    @State private var saveMessage = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Drawing Canvas
                DrawingCanvasView(
                    canvasView: $drawingViewModel.canvasView,
                    toolPicker: $drawingViewModel.toolPicker
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Bottom Toolbar
                ToolbarView(viewModel: drawingViewModel, showColorPicker: $showColorPicker)
            }
            .navigationTitle("Малюнак")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        drawingViewModel.clearCanvas()
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(.red)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            saveToPhotos()
                        } label: {
                            Label("Захаваць у фота", systemImage: "photo")
                        }
                        Button {
                            drawingViewModel.undo()
                        } label: {
                            Label("Адмяніць", systemImage: "arrow.uturn.backward")
                        }
                        Button {
                            drawingViewModel.redo()
                        } label: {
                            Label("Паўтарыць", systemImage: "arrow.uturn.forward")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showColorPicker) {
                ColorPickerSheet(selectedColor: $drawingViewModel.selectedColor) {
                    drawingViewModel.updateToolColor()
                }
            }
            .alert("Захаванне", isPresented: $showSaveAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(saveMessage)
            }
        }
    }

    private func saveToPhotos() {
        let image = drawingViewModel.canvasView.drawing.image(
            from: drawingViewModel.canvasView.bounds,
            scale: UIScreen.main.scale
        )
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        saveMessage = "Малюнак захаваны ў фота!"
        showSaveAlert = true
    }
}

#Preview {
    ContentView()
}
