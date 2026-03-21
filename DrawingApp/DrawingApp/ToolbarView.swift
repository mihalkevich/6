import SwiftUI

struct ToolbarView: View {
    @ObservedObject var viewModel: DrawingViewModel
    @Binding var showColorPicker: Bool

    var body: some View {
        VStack(spacing: 8) {
            // Tool Selection
            HStack(spacing: 16) {
                ForEach(DrawingViewModel.DrawingTool.allCases, id: \.self) { tool in
                    Button {
                        viewModel.selectTool(tool)
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tool.icon)
                                .font(.title2)
                                .foregroundStyle(viewModel.selectedTool == tool ? .white : .primary)
                            Text(tool.rawValue)
                                .font(.caption2)
                                .foregroundStyle(viewModel.selectedTool == tool ? .white : .primary)
                        }
                        .frame(width: 60, height: 50)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(viewModel.selectedTool == tool ? Color.accentColor : Color.clear)
                        )
                    }
                }

                Divider()
                    .frame(height: 40)

                // Color Button
                Button {
                    showColorPicker = true
                } label: {
                    Circle()
                        .fill(viewModel.selectedColor)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(Color.primary.opacity(0.3), lineWidth: 2)
                        )
                }
            }
            .padding(.horizontal)

            // Line Width Slider
            if viewModel.selectedTool != .eraser {
                HStack {
                    Image(systemName: "line.diagonal")
                        .font(.caption)
                    Slider(value: $viewModel.lineWidth, in: 1...20, step: 1) { _ in
                        viewModel.updateTool()
                    }
                    Image(systemName: "line.diagonal")
                        .font(.title3)
                }
                .padding(.horizontal, 24)
            }
        }
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}
