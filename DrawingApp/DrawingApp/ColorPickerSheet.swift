import SwiftUI

struct ColorPickerSheet: View {
    @Binding var selectedColor: Color
    @Environment(\.dismiss) private var dismiss
    var onColorSelected: () -> Void

    private let presetColors: [Color] = [
        .black, .gray, .red, .orange, .yellow,
        .green, .mint, .cyan, .blue, .indigo,
        .purple, .pink, .brown, .white
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Preset Colors Grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 12) {
                    ForEach(presetColors, id: \.self) { color in
                        Button {
                            selectedColor = color
                            onColorSelected()
                        } label: {
                            Circle()
                                .fill(color)
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Circle()
                                        .stroke(Color.primary.opacity(0.2), lineWidth: 1)
                                )
                                .overlay(
                                    Circle()
                                        .stroke(Color.accentColor, lineWidth: 3)
                                        .opacity(selectedColor == color ? 1 : 0)
                                )
                        }
                    }
                }
                .padding()

                // System Color Picker
                ColorPicker("Свой колер", selection: $selectedColor, supportsOpacity: true)
                    .padding(.horizontal)
                    .onChange(of: selectedColor) {
                        onColorSelected()
                    }

                Spacer()
            }
            .padding(.top)
            .navigationTitle("Выбар колеру")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Гатова") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
